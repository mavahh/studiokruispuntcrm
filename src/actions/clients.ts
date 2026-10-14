'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { fail, ok, oneOf, str, url, type ActionState } from '@/lib/action-state'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ClientStatus } from '@/lib/types'
import { dbError, teamContext } from './_shared'

const STATUSES: ClientStatus[] = ['lead', 'actief', 'gepauzeerd', 'gestopt']

function clientFields(fd: FormData) {
  return {
    name: str(fd, 'name'),
    contact_name: str(fd, 'contact_name'),
    email: str(fd, 'email'),
    phone: str(fd, 'phone'),
    vat_number: str(fd, 'vat_number'),
    address: str(fd, 'address'),
    city: str(fd, 'city'),
    website: url(fd, 'website'),
    instagram: str(fd, 'instagram'),
    tiktok: str(fd, 'tiktok'),
    facebook: str(fd, 'facebook'),
    linkedin: str(fd, 'linkedin'),
    drive_url: url(fd, 'drive_url'),
    status: oneOf(fd, 'status', STATUSES, 'actief'),
    notes: str(fd, 'notes'),
  }
}

export async function createClientAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await teamContext()
  const fields = clientFields(fd)
  if (!fields.name) return fail('Geef de klant een naam.')
  const { data, error } = await supabase.from('clients').insert(fields).select('id').single()
  const msg = dbError(error)
  if (msg) return fail(msg)
  revalidatePath('/klanten')
  redirect(`/klanten/${data!.id}`)
}

export async function updateClientAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await teamContext()
  const fields = clientFields(fd)
  if (!fields.name) return fail('Geef de klant een naam.')
  const msg = dbError((await supabase.from('clients').update(fields).eq('id', id)).error)
  if (msg) return fail(msg)
  revalidatePath('/klanten', 'layout')
  return ok()
}

export async function deleteClientAction(id: string) {
  const { supabase } = await teamContext()
  // Portaal-logins van deze klant mee opruimen.
  const admin = createAdminClient()
  const { data: users } = await admin.from('profiles').select('id').eq('client_id', id)
  for (const u of users ?? []) await admin.auth.admin.deleteUser(u.id as string)
  await supabase.from('clients').delete().eq('id', id)
  revalidatePath('/klanten')
  redirect('/klanten')
}

export async function createPortalLoginAction(clientId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  await teamContext()
  const email = str(fd, 'email')?.toLowerCase()
  const password = str(fd, 'password')
  const fullName = str(fd, 'full_name')
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return fail('Vul een geldig e-mailadres in.')
  if (!password || password.length < 10) return fail('Kies een wachtwoord van minstens 10 tekens.')

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName ?? email },
    app_metadata: { role: 'client', client_id: clientId },
  })
  if (error || !data.user) {
    console.error(error)
    if (error && /already|registered|exists/i.test(error.message)) return fail('Er bestaat al een account met dit e-mailadres.')
    return fail('Account aanmaken is mislukt.')
  }
  // app_metadata staat nog niet in de rij die de profieltrigger ziet: profiel hier expliciet koppelen.
  const { error: linkError } = await admin
    .from('profiles')
    .update({ role: 'client', client_id: clientId, full_name: fullName ?? email })
    .eq('id', data.user.id)
  if (linkError) {
    console.error(linkError)
    await admin.auth.admin.deleteUser(data.user.id)
    return fail('Account aanmaken is mislukt.')
  }
  revalidatePath(`/klanten/${clientId}`)
  return ok()
}

export async function resetPortalPasswordAction(userId: string, clientId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  await teamContext()
  const password = str(fd, 'password')
  if (!password || password.length < 10) return fail('Kies een wachtwoord van minstens 10 tekens.')
  const admin = createAdminClient()
  // Enkel klant-accounts van deze klant: nooit een teamaccount via deze weg wijzigen.
  const { data: target } = await admin.from('profiles').select('role, client_id').eq('id', userId).single()
  if (!target || target.role !== 'client' || target.client_id !== clientId) return fail('Account niet gevonden.')
  const { error } = await admin.auth.admin.updateUserById(userId, { password })
  if (error) return fail('Wachtwoord wijzigen is mislukt.')
  return ok()
}

export async function removePortalLoginAction(userId: string, clientId: string) {
  await teamContext()
  const admin = createAdminClient()
  const { data: target } = await admin.from('profiles').select('role, client_id').eq('id', userId).single()
  if (!target || target.role !== 'client' || target.client_id !== clientId) return
  await admin.auth.admin.deleteUser(userId)
  revalidatePath(`/klanten/${clientId}`)
}
