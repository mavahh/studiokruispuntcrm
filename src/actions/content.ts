'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { fail, ok, oneOf, str, url, type ActionState } from '@/lib/action-state'
import { optionFor, CONTENT_STATUSES, PLATFORMS } from '@/lib/constants'
import { clientUserIds, notify, teamIds } from '@/lib/notify'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ContentStatus, ContentType } from '@/lib/types'
import { clientContext, dbError, displayName, teamContext } from './_shared'

const STATUSES: ContentStatus[] = ['idee', 'script', 'opname', 'montage', 'feedback', 'goedgekeurd', 'ingepland', 'gepost']
const TYPES: ContentType[] = ['post', 'reel', 'video', 'story', 'carrousel']

function fields(fd: FormData) {
  return {
    client_id: str(fd, 'client_id'),
    project_id: str(fd, 'project_id'),
    title: str(fd, 'title'),
    type: oneOf(fd, 'type', TYPES, 'reel'),
    platforms: fd.getAll('platforms').map(String).filter((p) => (PLATFORMS as readonly string[]).includes(p)),
    status: oneOf(fd, 'status', STATUSES, 'idee'),
    drive_url: url(fd, 'drive_url'),
    caption: str(fd, 'caption'),
    planned_date: str(fd, 'planned_date'),
    posted_url: url(fd, 'posted_url'),
    assignee_id: str(fd, 'assignee_id'),
  }
}

/** Klant verwittigen wanneer content klaarstaat voor feedback. */
async function onStatusChange(itemId: string, clientId: string, title: string, from: string | null, to: ContentStatus) {
  if (from === to) return
  if (to === 'feedback') {
    await notify(await clientUserIds(clientId), {
      title: `Nieuwe content klaar voor feedback: ${title}`,
      body: 'Bekijk de video of post en laat weten wat je ervan vindt, of keur ze meteen goed.',
      link: `/portaal/${itemId}`,
    })
  }
}

function revalidate() {
  revalidatePath('/', 'layout')
}

export async function createContentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await teamContext()
  const f = fields(fd)
  if (!f.title) return fail('Geef de content een titel.')
  if (!f.client_id) return fail('Kies een klant.')
  if (str(fd, 'drive_url') && !f.drive_url) return fail('De Google Drive-link is ongeldig.')
  const { data, error } = await supabase.from('content_items').insert(f).select('id').single()
  const msg = dbError(error)
  if (msg) return fail(msg)
  await onStatusChange(data!.id, f.client_id, f.title, null, f.status)
  revalidate()
  return ok()
}

export async function updateContentAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await teamContext()
  const f = fields(fd)
  if (!f.title) return fail('Geef de content een titel.')
  if (!f.client_id) return fail('Kies een klant.')
  if (str(fd, 'drive_url') && !f.drive_url) return fail('De Google Drive-link is ongeldig.')
  const { data: before } = await supabase.from('content_items').select('status').eq('id', id).single()
  const msg = dbError((await supabase.from('content_items').update(f).eq('id', id)).error)
  if (msg) return fail(msg)
  await onStatusChange(id, f.client_id, f.title, before?.status ?? null, f.status)
  revalidate()
  return ok()
}

export async function setContentStatusAction(id: string, status: string) {
  const { supabase } = await teamContext()
  if (!(STATUSES as string[]).includes(status)) return
  const { data: before } = await supabase.from('content_items').select('status, client_id, title').eq('id', id).single()
  if (!before) return
  await supabase.from('content_items').update({ status }).eq('id', id)
  await onStatusChange(id, before.client_id as string, before.title as string, before.status as string, status as ContentStatus)
  revalidate()
}

export async function deleteContentAction(id: string, back: string) {
  const { supabase } = await teamContext()
  await supabase.from('content_items').delete().eq('id', id)
  revalidate()
  redirect(back.startsWith('/') && !back.startsWith('//') ? back : '/content')
}

export async function teamCommentAction(itemId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, profile } = await teamContext()
  const body = str(fd, 'body')
  if (!body) return fail('Schrijf eerst een bericht.')
  const { data: item } = await supabase.from('content_items').select('client_id, title').eq('id', itemId).single()
  if (!item) return fail('Content niet gevonden.')
  const msg = dbError((await supabase.from('content_comments').insert({ content_item_id: itemId, author_id: profile.id, body })).error)
  if (msg) return fail(msg)
  await notify(await clientUserIds(item.client_id as string), {
    title: `Nieuw bericht over ${item.title}`,
    body: `${displayName(profile)}: ${body.slice(0, 200)}`,
    link: `/portaal/${itemId}`,
  })
  revalidate()
  return ok()
}

// ─── Klantportaal ──────────────────────────────────────────────────────────

export async function clientCommentAction(itemId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, profile } = await clientContext()
  const body = str(fd, 'body')
  if (!body) return fail('Schrijf eerst je feedback.')
  // RLS controleert dat dit item van deze klant is.
  const { data: item } = await supabase.from('content_items').select('id, title, client_id').eq('id', itemId).single()
  if (!item || item.client_id !== profile.client_id) return fail('Content niet gevonden.')
  const msg = dbError((await supabase.from('content_comments').insert({ content_item_id: itemId, author_id: profile.id, body })).error)
  if (msg) return fail(msg)
  const { data: client } = await supabase.from('clients').select('name').eq('id', profile.client_id).single()
  await notify(await teamIds(), {
    title: `Feedback van ${client?.name ?? 'een klant'} op ${item.title}`,
    body: body.slice(0, 300),
    link: `/content/${itemId}`,
  })
  revalidatePath('/portaal', 'layout')
  return ok()
}

/** Klant keurt goed of vraagt aanpassingen. Enkel mogelijk zolang de status "feedback" is. */
export async function clientDecisionAction(itemId: string, decision: 'goedkeuren' | 'aanpassen', _: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, profile } = await clientContext()
  const { data: item } = await supabase.from('content_items').select('id, title, client_id, status').eq('id', itemId).single()
  if (!item || item.client_id !== profile.client_id) return fail('Content niet gevonden.')
  if (item.status !== 'feedback') return fail('Deze content wacht niet (meer) op je feedback.')
  const note = str(fd, 'body')
  if (decision === 'aanpassen' && !note) return fail('Laat weten wat er aangepast moet worden.')

  const admin = createAdminClient()
  const next: ContentStatus = decision === 'goedkeuren' ? 'goedgekeurd' : 'montage'
  const { error } = await admin.from('content_items').update({ status: next }).eq('id', itemId).eq('client_id', profile.client_id)
  if (error) return fail('Opslaan is mislukt.')

  const label = decision === 'goedkeuren' ? '✓ Goedgekeurd' : '↺ Aanpassingen gevraagd'
  await supabase.from('content_comments').insert({
    content_item_id: itemId,
    author_id: profile.id,
    body: note ? `${label}: ${note}` : label,
  })

  const { data: client } = await supabase.from('clients').select('name').eq('id', profile.client_id).single()
  await notify(await teamIds(), {
    title:
      decision === 'goedkeuren'
        ? `${client?.name ?? 'Klant'} keurde "${item.title}" goed`
        : `${client?.name ?? 'Klant'} vraagt aanpassingen aan "${item.title}"`,
    body: note ?? `Nieuwe status: ${optionFor(CONTENT_STATUSES, next).label}.`,
    link: `/content/${itemId}`,
  })
  revalidatePath('/', 'layout')
  return ok()
}
