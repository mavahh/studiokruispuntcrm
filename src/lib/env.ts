// Supabase noemt de publieke sleutel tegenwoordig "publishable key"; de oude naam blijft werken.
// Volledig uitgeschreven zodat Next.js de waarden bij de build kan invullen.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

/** True zodra de Supabase-variabelen ingesteld zijn (Vercel → Settings → Environment Variables). */
export function isConfigured() {
  return !!SUPABASE_URL && !!SUPABASE_KEY
}
