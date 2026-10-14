import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { Notification } from '@/lib/types'
import { PageHeader } from '@/components/ui'
import { NotificationList } from '@/components/notification-list'

export const metadata: Metadata = { title: 'Meldingen' }

export default async function PortalNotificationsPage() {
  const profile = await requireClient()
  const supabase = await createClient()
  const { data } = await supabase.from('notifications').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(100)
  return (
    <div className="animate-reveal">
      <PageHeader title="Meldingen" />
      <NotificationList notifications={(data ?? []) as Notification[]} />
    </div>
  )
}
