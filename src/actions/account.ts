'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { fail, ok, str, type ActionState } from '@/lib/action-state'
import { createClient } from '@/lib/supabase/server'

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = str(fd, 'email')
  const password = str(fd, 'password')
  if (!email || !password) return fail('Vul je e-mailadres en wachtwoord in.')
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.user) return fail('E-mailadres of wachtwoord klopt niet.')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
  redirect(profile?.role === 'team' ? '/' : '/portaal')
}

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function changePasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const password = str(fd, 'password')
  const repeat = str(fd, 'password_repeat')
  if (!password || password.length < 10) return fail('Kies een wachtwoord van minstens 10 tekens.')
  if (password !== repeat) return fail('De wachtwoorden zijn niet gelijk.')
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return fail('Wachtwoord wijzigen is mislukt.')
  return ok()
}

export async function markNotificationReadAction(id: string) {
  const supabase = await createClient()
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).is('read_at', null)
  revalidatePath('/', 'layout')
}

export async function markAllNotificationsReadAction() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).is('read_at', null)
  revalidatePath('/', 'layout')
}

/** Opent een melding: markeert ze als gelezen en gaat naar de link. */
export async function openNotificationAction(id: string, link: string | null) {
  await markNotificationReadAction(id)
  redirect(link && link.startsWith('/') && !link.startsWith('//') ? link : '/meldingen')
}
