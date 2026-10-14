import 'server-only'
import { createAdminClient } from './supabase/admin'

type Message = {
  title: string
  body?: string
  link?: string
  /** Zelfde sleutel = maar één melding per gebruiker (voor herinneringen). */
  dedupeKey?: string
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

async function sendEmail(to: string, msg: Message) {
  const key = process.env.RESEND_API_KEY
  if (!key) return
  const url = msg.link ? `${siteUrl()}${msg.link}` : siteUrl()
  const html = `
  <div style="font-family:Arial,sans-serif;background:#F3F5FA;padding:32px">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
      <div style="background:#1B2C5E;padding:20px 24px">
        <img src="${siteUrl()}/logo-wit.png" alt="Studio Kruispunt" width="74" height="48" style="display:block;border:0" />
      </div>
      <div style="padding:24px;color:#1B2C5E">
        <h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(msg.title)}</h1>
        ${msg.body ? `<p style="font-size:15px;line-height:1.6;margin:0 0 20px">${escapeHtml(msg.body)}</p>` : ''}
        <a href="${url}" style="display:inline-block;background:#00DD9E;color:#1B2C5E;text-decoration:none;font-weight:600;padding:10px 20px;border-radius:999px">Bekijken</a>
      </div>
    </div>
  </div>`
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? 'Studio Kruispunt CRM <crm@studiokruispunt.be>',
        to,
        subject: msg.title,
        html,
      }),
    })
    if (!res.ok) console.error('E-mail niet verstuurd', res.status, await res.text())
  } catch (err) {
    console.error('E-mail niet verstuurd', err)
  }
}

/** Melding in de app + e-mail. Faalt nooit hard: meldingen mogen een actie niet blokkeren. */
export async function notify(userIds: (string | null | undefined)[], msg: Message, opts: { email?: boolean } = {}) {
  const ids = [...new Set(userIds.filter((id): id is string => !!id))]
  if (ids.length === 0) return
  try {
    const admin = createAdminClient()
    const rows = ids.map((user_id) => ({
      user_id,
      title: msg.title,
      body: msg.body ?? null,
      link: msg.link ?? null,
      dedupe_key: msg.dedupeKey ?? null,
    }))
    const query = msg.dedupeKey
      ? admin.from('notifications').upsert(rows, { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true }).select('user_id')
      : admin.from('notifications').insert(rows).select('user_id')
    const { data, error } = await query
    if (error) {
      console.error('Melding niet opgeslagen', error)
      return
    }
    if (opts.email === false) return
    // Enkel mailen naar wie effectief een nieuwe melding kreeg (geen dubbele herinneringen).
    const newIds = (data ?? []).map((r) => r.user_id as string)
    if (newIds.length === 0) return
    const { data: profiles } = await admin.from('profiles').select('email').in('id', newIds)
    await Promise.all((profiles ?? []).map((p) => sendEmail(p.email as string, msg)))
  } catch (err) {
    console.error('Melding mislukt', err)
  }
}

export async function teamIds() {
  const admin = createAdminClient()
  const { data } = await admin.from('profiles').select('id').eq('role', 'team')
  return (data ?? []).map((p) => p.id as string)
}

export async function clientUserIds(clientId: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('profiles').select('id').eq('role', 'client').eq('client_id', clientId)
  return (data ?? []).map((p) => p.id as string)
}
