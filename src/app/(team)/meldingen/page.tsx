import type { Metadata } from 'next'
import { requireTeam } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { Notification } from '@/lib/types'
import { PageHeader } from '@/components/ui'
import { NotificationList } from '@/components/notification-list'

export const metadata: Metadata = { title: 'Meldingen' }

export default async function NotificationsPage() {
  const profile = await requireTeam()
  const supabase = await createClient()
  const { data } = await supabase.from('notifications').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(100)
  return (
    <div className="animate-reveal">
      <PageHeader title="Meldingen" description="Feedback van klanten, toegewezen taken en herinneringen." />
      <NotificationList notifications={(data ?? []) as Notification[]} />
    </div>
  )
}
