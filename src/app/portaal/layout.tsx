import Link from 'next/link'
import { Bell, LogOut } from 'lucide-react'
import { logoutAction } from '@/actions/account'
import { requireClient } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireClient()
  const supabase = await createClient()
  const [{ data: client }, { count }] = await Promise.all([
    supabase.from('clients').select('name').eq('id', profile.client_id).single(),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', profile.id).is('read_at', null),
  ])
  const unread = count ?? 0
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 bg-nacht pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-[1000px] items-center justify-between gap-3 px-4 md:h-16 md:px-8">
          <Link href="/portaal" className="flex min-w-0 items-center gap-3">
            <Logo light />
            <span className="hidden truncate border-l border-white/20 pl-3 text-[14px] text-white/75 sm:block">{client?.name}</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/portaal/meldingen" className="btn btn-icon relative text-white hover:bg-white/10" aria-label={`Meldingen (${unread} ongelezen)`}>
              <Bell size={19} />
              {unread > 0 && <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-mint" />}
            </Link>
            <Link href="/portaal/account" className="btn btn-sm text-white/80 hover:bg-white/10 hover:text-white">
              Account
            </Link>
            <form action={logoutAction}>
              <button className="btn btn-icon text-white/80 hover:bg-white/10 hover:text-white" aria-label="Uitloggen" title="Uitloggen">
                <LogOut size={18} />
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1000px] px-4 py-6 md:px-8 md:py-10">{children}</main>
    </div>
  )
}
