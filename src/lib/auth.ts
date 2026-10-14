import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { isConfigured } from './env'
import { createClient } from './supabase/server'
import type { Profile } from './types'

export const getProfile = cache(async (): Promise<Profile | null> => {
  if (!isConfigured()) return null
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('id, email, full_name, role, client_id').eq('id', user.id).single()
  return (data as Profile | null) ?? null
})

export async function requireTeam() {
  const profile = await getProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'team') redirect('/portaal')
  return profile
}

export async function requireClient() {
  const profile = await getProfile()
  if (!profile) redirect('/login')
  if (profile.role === 'team') redirect('/')
  if (!profile.client_id) redirect('/login?fout=geen-klant')
  return profile as Profile & { client_id: string }
}

export const getTeam = cache(async () => {
  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select('id, email, full_name, role, client_id').eq('role', 'team').order('full_name')
  return (data ?? []) as Profile[]
})
