// Maakt een teamaccount aan (of maakt een bestaand account teamlid).
// Gebruik: node --env-file=.env.local scripts/maak-teamlid.mjs liam@studiokruispunt.be "Liam" wachtwoord
import { createClient } from '@supabase/supabase-js'

const [email, fullName, password] = process.argv.slice(2)
if (!email || !fullName || !password) {
  console.error('Gebruik: npm run teamlid -- <email> "<naam>" <wachtwoord>')
  process.exit(1)
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY zijn nodig (zet ze in .env.local).')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })
const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName },
  app_metadata: { role: 'team' },
})

if (error && !/already|registered|exists/i.test(error.message)) {
  console.error('Mislukt:', error.message)
  process.exit(1)
}

let id = data?.user?.id
if (!id) {
  const { data: existing } = await supabase.from('profiles').select('id').eq('email', email.toLowerCase()).single()
  id = existing?.id
  if (!id) {
    console.error('Account bestaat al, maar geen profiel gevonden.')
    process.exit(1)
  }
  await supabase.auth.admin.updateUserById(id, { app_metadata: { role: 'team' } })
}
await supabase.from('profiles').update({ role: 'team', full_name: fullName, client_id: null }).eq('id', id)
console.log(`✓ ${fullName} <${email}> is teamlid.`)
