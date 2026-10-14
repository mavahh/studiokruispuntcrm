import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth'
import { isConfigured } from '@/lib/env'
import { Logo } from '@/components/ui'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Inloggen' }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ fout?: string }> }) {
  const profile = await getProfile()
  const { fout } = await searchParams
  if (profile?.role === 'team') redirect('/')
  if (profile?.role === 'client' && profile.client_id) redirect('/portaal')

  return (
    <main className="grid min-h-dvh md:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-blauw p-12 text-white md:flex md:flex-col md:justify-between">
        <Logo light />
        <div>
          <p className="eyebrow mb-4 text-mint!">CRM</p>
          <h1 className="max-w-md text-[48px] leading-[1.02] font-bold text-white">Alles van je klanten op één kruispunt.</h1>
          <p className="mt-4 max-w-sm text-[17px] text-white/80">Content, projecten, contracten en cijfers. Voor Liam, Cedric en hun klanten.</p>
        </div>
        <p className="text-[13px] text-white/60">Studio Kruispunt · de Kempen</p>
        <svg aria-hidden="true" viewBox="0 0 40 40" className="pointer-events-none absolute -right-24 -bottom-24 h-[420px] w-[420px] text-nacht/60" fill="currentColor">
          <path d="M15 3h10v12h12v10H25v12H15V25H3V15h12z" />
        </svg>
      </section>
      <section className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm animate-reveal">
          <div className="mb-10 md:hidden">
            <Logo />
          </div>
          <h2 className="text-[28px] font-bold">Inloggen</h2>
          <p className="mt-1 mb-6 text-inkt-zacht">Klant? Je kreeg je login van Studio Kruispunt.</p>
          {fout === 'geen-klant' && (
            <p className="mb-4 rounded-veld bg-signaal-soft px-3 py-2 text-[14px] text-[#9a4300]">
              Je account is nog niet aan een klant gekoppeld. Neem contact op met Studio Kruispunt.
            </p>
          )}
          {isConfigured() ? (
            <LoginForm />
          ) : (
            <div className="rounded-kaart border border-signaal/50 bg-signaal-soft p-4 text-[14px] text-[#9a4300]">
              <p className="font-semibold">De CRM is nog niet gekoppeld aan de database.</p>
              <p className="mt-1">
                Zet <code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> en <code>SUPABASE_SERVICE_ROLE_KEY</code> in Vercel en
                deploy opnieuw.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
