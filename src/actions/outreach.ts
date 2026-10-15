'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { fail, ok, oneOf, str, url, type ActionState } from '@/lib/action-state'
import { aiConfigured, draftOutreachEmail } from '@/lib/ai'
import { FOLLOW_UP_DAYS, LEAD_STATUSES, OUTCOMES, optionFor } from '@/lib/constants'
import { addDaysISO, todayISO } from '@/lib/format'
import { outreachHtml, outreachText } from '@/lib/outreach'
import type { ActivityType, Lead, LeadStatus, Outcome, TemplateKind } from '@/lib/types'
import { dbError, displayName, teamContext } from './_shared'

const STATUSES: LeadStatus[] = ['nieuw', 'gecontacteerd', 'opvolgen', 'gesprek', 'offerte', 'gewonnen', 'verloren']
const OUTCOME_VALUES: Outcome[] = ['geen_antwoord', 'terugbellen', 'interesse', 'afspraak', 'geen_interesse']
const KINDS: TemplateKind[] = ['eerste', 'opvolging', 'na_gesprek']
const CLOSED: LeadStatus[] = ['gewonnen', 'verloren']

function revalidate() {
  revalidatePath('/', 'layout')
}

function leadFields(fd: FormData) {
  return {
    business_name: str(fd, 'business_name'),
    contact_name: str(fd, 'contact_name'),
    email: str(fd, 'email')?.toLowerCase() ?? null,
    phone: str(fd, 'phone'),
    city: str(fd, 'city'),
    sector: str(fd, 'sector'),
    website: url(fd, 'website'),
    instagram: str(fd, 'instagram'),
    source: str(fd, 'source') ?? 'handmatig',
    owner_id: str(fd, 'owner_id'),
    next_follow_up: str(fd, 'next_follow_up'),
    do_not_contact: fd.get('do_not_contact') === 'on',
    notes: str(fd, 'notes'),
  }
}

function validEmail(email: string | null) {
  return !email || /^\S+@\S+\.\S+$/.test(email)
}

export async function createLeadAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, profile } = await teamContext()
  const f = leadFields(fd)
  if (!f.business_name) return fail('Geef de naam van de zaak.')
  if (!validEmail(f.email)) return fail('Het e-mailadres is ongeldig.')
  const { data, error } = await supabase
    .from('leads')
    .insert({ ...f, owner_id: f.owner_id ?? profile.id, status: oneOf(fd, 'status', STATUSES, 'nieuw') })
    .select('id')
    .single()
  const msg = dbError(error)
  if (msg) return fail(msg)
  revalidate()
  redirect(`/outreach/${data!.id}`)
}

export async function updateLeadAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await teamContext()
  const f = leadFields(fd)
  if (!f.business_name) return fail('Geef de naam van de zaak.')
  if (!validEmail(f.email)) return fail('Het e-mailadres is ongeldig.')
  const msg = dbError((await supabase.from('leads').update(f).eq('id', id)).error)
  if (msg) return fail(msg)
  revalidate()
  return ok()
}

export async function deleteLeadAction(id: string) {
  const { supabase } = await teamContext()
  await supabase.from('leads').delete().eq('id', id)
  revalidate()
  redirect('/outreach')
}

export async function setLeadStatusAction(id: string, status: string) {
  const { supabase, profile } = await teamContext()
  if (!(STATUSES as string[]).includes(status)) return
  const { data: before } = await supabase.from('leads').select('status').eq('id', id).single()
  if (!before || before.status === status) return
  const patch: Partial<Lead> = { status: status as LeadStatus }
  if (CLOSED.includes(status as LeadStatus)) patch.next_follow_up = null
  await supabase.from('leads').update(patch).eq('id', id)
  await supabase.from('lead_activities').insert({
    lead_id: id,
    type: 'status',
    body: `${optionFor(LEAD_STATUSES, before.status as LeadStatus).label} → ${optionFor(LEAD_STATUSES, status as LeadStatus).label}`,
    created_by: profile.id,
  })
  revalidate()
}

export async function setFollowUpAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await teamContext()
  const date = str(fd, 'next_follow_up')
  const msg = dbError((await supabase.from('leads').update({ next_follow_up: date }).eq('id', id)).error)
  if (msg) return fail(msg)
  revalidate()
  return ok()
}

/** Telefoon, bezoek of notitie loggen; past status en opvolgdatum aan op basis van het resultaat. */
export async function logContactAction(leadId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, profile } = await teamContext()
  const type = oneOf<ActivityType>(fd, 'type', ['telefoon', 'bezoek', 'notitie'], 'telefoon')
  const outcome = type === 'notitie' ? null : (oneOf(fd, 'outcome', OUTCOME_VALUES, 'geen_antwoord') as Outcome)
  const body = str(fd, 'body')
  if (type === 'notitie' && !body) return fail('Schrijf eerst een notitie.')

  const { data: lead } = await supabase.from('leads').select('status').eq('id', leadId).single()
  if (!lead) return fail('Lead niet gevonden.')

  const { error } = await supabase.from('lead_activities').insert({ lead_id: leadId, type, outcome, body, created_by: profile.id })
  const msg = dbError(error)
  if (msg) return fail(msg)

  if (type !== 'notitie') {
    let status = lead.status as LeadStatus
    if (outcome === 'afspraak') status = 'gesprek'
    else if (outcome === 'geen_interesse') status = 'verloren'
    else if (!CLOSED.includes(status) && ['nieuw', 'gecontacteerd'].includes(status)) status = outcome === 'interesse' ? 'opvolgen' : 'gecontacteerd'

    const chosen = str(fd, 'next_follow_up')
    const next =
      status === 'verloren' ? null : (chosen ?? (outcome && outcome !== 'geen_interesse' ? addDaysISO(todayISO(), FOLLOW_UP_DAYS[outcome]) : null))
    await supabase.from('leads').update({ status, next_follow_up: next, last_contacted_at: new Date().toISOString() }).eq('id', leadId)
    if (status !== lead.status) {
      await supabase.from('lead_activities').insert({
        lead_id: leadId,
        type: 'status',
        body: `${optionFor(LEAD_STATUSES, lead.status as LeadStatus).label} → ${optionFor(LEAD_STATUSES, status).label} (${optionFor(OUTCOMES, outcome!).label.toLowerCase()})`,
        created_by: profile.id,
      })
    }
  }
  revalidate()
  return ok()
}

/**
 * Verstuurt een outreach-mail via Resend (mode=send), of logt een mail die je zelf
 * in je eigen mailprogramma verstuurde (mode=manual).
 */
export async function sendLeadEmailAction(leadId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, profile } = await teamContext()
  const subject = str(fd, 'subject')
  const body = str(fd, 'body')
  const mode = oneOf(fd, 'mode', ['send', 'manual'] as const, 'send')
  if (!subject || !body) return fail('Vul een onderwerp en tekst in.')

  const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single<Lead>()
  if (!lead) return fail('Lead niet gevonden.')
  if (lead.do_not_contact) return fail('Deze lead wil niet meer gecontacteerd worden.')

  if (mode === 'send') {
    if (!lead.email) return fail('Deze lead heeft geen e-mailadres.')
    const key = process.env.RESEND_API_KEY
    const fromAddress = process.env.OUTREACH_FROM
    if (!key || !fromAddress) return fail('Versturen vanuit de CRM is nog niet ingesteld (RESEND_API_KEY en OUTREACH_FROM). Gebruik "Open in mailprogramma".')
    const senderName = displayName(profile).split(' ')[0]
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${senderName} | Studio Kruispunt <${fromAddress}>`,
        to: lead.email,
        reply_to: profile.email,
        subject,
        html: outreachHtml(body),
        text: outreachText(body),
      }),
    }).catch(() => null)
    if (!res || !res.ok) {
      console.error('Outreach-mail niet verstuurd', res?.status, res && (await res.text()))
      return fail('Versturen is mislukt. Controleer de Resend-instellingen of probeer opnieuw.')
    }
  }

  await supabase.from('lead_activities').insert({ lead_id: leadId, type: 'email', subject, body, created_by: profile.id })
  const status: LeadStatus = ['nieuw', 'opvolgen'].includes(lead.status) ? 'gecontacteerd' : lead.status
  await supabase
    .from('leads')
    .update({
      status,
      last_contacted_at: new Date().toISOString(),
      next_follow_up: str(fd, 'next_follow_up') ?? addDaysISO(todayISO(), FOLLOW_UP_DAYS.email),
    })
    .eq('id', leadId)
  revalidate()
  return ok()
}

/** Laat Claude een persoonlijke mail schrijven voor deze lead. */
export async function generateLeadEmailAction(leadId: string, kind: string, extra: string): Promise<{ subject?: string; body?: string; error?: string }> {
  const { supabase, profile } = await teamContext()
  if (!aiConfigured()) return { error: 'AI is nog niet ingesteld: zet ANTHROPIC_API_KEY in Vercel.' }
  const [{ data: lead }, { data: history }] = await Promise.all([
    supabase.from('leads').select('*').eq('id', leadId).single<Lead>(),
    supabase.from('lead_activities').select('type, subject, body, outcome, created_at').eq('lead_id', leadId).neq('type', 'status').order('created_at', { ascending: false }).limit(8),
  ])
  if (!lead) return { error: 'Lead niet gevonden.' }
  try {
    return await draftOutreachEmail({
      lead,
      kind: (KINDS as string[]).includes(kind) ? (kind as TemplateKind) : 'eerste',
      sender: displayName(profile).split(' ')[0]!,
      history: history ?? [],
      extra: extra.trim().slice(0, 500) || null,
    })
  } catch (err) {
    console.error('AI-mail mislukt', err)
    return { error: 'De AI kon nu geen mail schrijven. Probeer opnieuw of kies een sjabloon.' }
  }
}

/** Gewonnen lead → klant in de CRM. */
export async function convertLeadAction(id: string) {
  const { supabase, profile } = await teamContext()
  const { data: lead } = await supabase.from('leads').select('*').eq('id', id).single<Lead>()
  if (!lead) return
  if (lead.client_id) redirect(`/klanten/${lead.client_id}`)
  const { data: client, error } = await supabase
    .from('clients')
    .insert({
      name: lead.business_name,
      contact_name: lead.contact_name,
      email: lead.email,
      phone: lead.phone,
      city: lead.city,
      website: lead.website,
      instagram: lead.instagram,
      status: 'actief',
      notes: lead.notes,
    })
    .select('id')
    .single()
  if (error || !client) {
    console.error(error)
    return
  }
  await supabase.from('leads').update({ status: 'gewonnen', client_id: client.id, next_follow_up: null }).eq('id', id)
  await supabase.from('lead_activities').insert({ lead_id: id, type: 'status', body: `Omgezet naar klant door ${displayName(profile)}`, created_by: profile.id })
  revalidate()
  redirect(`/klanten/${client.id}`)
}

export type ImportRow = {
  business_name: string
  contact_name?: string
  email?: string
  phone?: string
  city?: string
  sector?: string
  website?: string
  instagram?: string
  notes?: string
}

/** Leads importeren uit CSV. Dubbels (zelfde e-mail, of zelfde naam + gemeente) worden overgeslagen. */
export async function importLeadsAction(rows: ImportRow[]): Promise<{ inserted?: number; skipped?: number; error?: string }> {
  const { supabase, profile } = await teamContext()
  if (!Array.isArray(rows) || rows.length === 0) return { error: 'Geen rijen gevonden.' }
  if (rows.length > 2000) return { error: 'Maximaal 2000 leads per import.' }

  const { data: existing } = await supabase.from('leads').select('business_name, city, email')
  const key = (name: string, city?: string | null) => `${name.trim().toLowerCase()}|${(city ?? '').trim().toLowerCase()}`
  const seenKeys = new Set((existing ?? []).map((l) => key(l.business_name, l.city)))
  const seenEmails = new Set((existing ?? []).map((l) => l.email?.toLowerCase()).filter(Boolean))

  const clean = (v: unknown, max = 300) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)
  const toInsert = []
  let skipped = 0
  for (const r of rows) {
    const name = clean(r.business_name, 200)
    if (!name) {
      skipped++
      continue
    }
    let email = clean(r.email, 200)?.toLowerCase() ?? null
    if (email && !/^\S+@\S+\.\S+$/.test(email)) email = null
    const k = key(name, clean(r.city))
    if (seenKeys.has(k) || (email && seenEmails.has(email))) {
      skipped++
      continue
    }
    seenKeys.add(k)
    if (email) seenEmails.add(email)
    let website = clean(r.website)
    if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`
    toInsert.push({
      business_name: name,
      contact_name: clean(r.contact_name),
      email,
      phone: clean(r.phone, 50),
      city: clean(r.city, 100),
      sector: clean(r.sector, 100),
      website,
      instagram: clean(r.instagram, 100),
      notes: clean(r.notes, 2000),
      source: 'import',
      owner_id: profile.id,
    })
  }
  for (let i = 0; i < toInsert.length; i += 500) {
    const { error } = await supabase.from('leads').insert(toInsert.slice(i, i + 500))
    if (error) {
      console.error(error)
      return { error: `Import gestopt na ${i} leads: opslaan mislukt.` }
    }
  }
  revalidate()
  return { inserted: toInsert.length, skipped }
}

// ─── Sjablonen ─────────────────────────────────────────────────────────────

function templateFields(fd: FormData) {
  return { name: str(fd, 'name'), kind: oneOf(fd, 'kind', KINDS, 'eerste'), subject: str(fd, 'subject'), body: str(fd, 'body') }
}

export async function createTemplateAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await teamContext()
  const f = templateFields(fd)
  if (!f.name || !f.subject || !f.body) return fail('Vul naam, onderwerp en tekst in.')
  const msg = dbError((await supabase.from('email_templates').insert(f)).error)
  if (msg) return fail(msg)
  revalidate()
  return ok()
}

export async function updateTemplateAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await teamContext()
  const f = templateFields(fd)
  if (!f.name || !f.subject || !f.body) return fail('Vul naam, onderwerp en tekst in.')
  const msg = dbError((await supabase.from('email_templates').update(f).eq('id', id)).error)
  if (msg) return fail(msg)
  revalidate()
  return ok()
}

export async function deleteTemplateAction(id: string) {
  const { supabase } = await teamContext()
  await supabase.from('email_templates').delete().eq('id', id)
  revalidate()
}
