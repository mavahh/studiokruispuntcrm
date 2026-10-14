import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types'

export class NotAllowed extends Error {}

/** Supabase-client voor een ingelogd teamlid; gooit een fout voor anderen. */
export async function teamContext() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new NotAllowed('Niet ingelogd')
  const { data: profile } = await supabase.from('profiles').select('id, email, full_name, role, client_id').eq('id', user.id).single()
  if (!profile || profile.role !== 'team') throw new NotAllowed('Geen toegang')
  return { supabase, profile: profile as Profile }
}

export async function clientContext() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new NotAllowed('Niet ingelogd')
  const { data: profile } = await supabase.from('profiles').select('id, email, full_name, role, client_id').eq('id', user.id).single()
  if (!profile || profile.role !== 'client' || !profile.client_id) throw new NotAllowed('Geen toegang')
  return { supabase, profile: profile as Profile & { client_id: string } }
}

export function dbError(error: { message: string; code?: string } | null, fallback = 'Opslaan is mislukt. Probeer opnieuw.') {
  if (!error) return null
  console.error(error)
  if (error.code === '23505') return 'Dit bestaat al.'
  if (error.code === '23514') return 'Een van de waarden is ongeldig.'
  if (error.code === '23503') return 'Een gekoppeld item bestaat niet (meer).'
  return fallback
}

export function displayName(p: Pick<Profile, 'full_name' | 'email'>) {
  return p.full_name || p.email
}
