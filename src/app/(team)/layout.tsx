import { requireTeam } from '@/lib/auth'
import { CONTRACT_WARNING_DAYS } from '@/lib/constants'
import { addDaysISO, todayISO } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import { TeamNav } from '@/components/nav'

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireTeam()
  const supabase = await createClient()
  const today = todayISO()
  const [{ count: unread }, { count: expiring }] = await Promise.all([
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', profile.id).is('read_at', null),
    supabase
      .from('contracts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'actief')
      .lte('end_date', addDaysISO(today, CONTRACT_WARNING_DAYS)),
  ])

  return (
    <div className="min-h-dvh">
      <TeamNav name={profile.full_name || profile.email} unread={unread ?? 0} contractAlerts={expiring ?? 0} />
      <main className="px-4 py-6 md:px-8 md:py-10 lg:ml-60">
        <div className="mx-auto max-w-[1200px]">{children}</div>
      </main>
    </div>
  )
}
