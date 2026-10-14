import { markAllNotificationsReadAction, openNotificationAction } from '@/actions/account'
import { formatDateTime } from '@/lib/format'
import type { Notification } from '@/lib/types'
import { EmptyState } from './ui'

export function NotificationList({ notifications }: { notifications: Notification[] }) {
  const unread = notifications.filter((n) => !n.read_at).length
  return (
    <div>
      {unread > 0 && (
        <form action={markAllNotificationsReadAction} className="mb-3 flex justify-end">
          <button className="btn btn-secondary btn-sm">Alles als gelezen markeren</button>
        </form>
      )}
      {notifications.length === 0 ? (
        <EmptyState title="Geen meldingen">Je krijgt hier een melding bij nieuwe feedback, toegewezen taken en naderende deadlines.</EmptyState>
      ) : (
        <ul className="card divide-y divide-lijn overflow-hidden">
          {notifications.map((n) => (
            <li key={n.id}>
              <form action={openNotificationAction.bind(null, n.id, n.link)}>
                <button className={`flex w-full cursor-pointer gap-3 px-5 py-3.5 text-left transition-colors duration-150 hover:bg-papier ${n.read_at ? '' : 'bg-mint-soft/30'}`}>
                  <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${n.read_at ? 'bg-transparent' : 'bg-mint'}`} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className={`block ${n.read_at ? '' : 'font-semibold'}`}>{n.title}</span>
                    {n.body && <span className="line-clamp-2 block text-[14px] text-inkt-zacht">{n.body}</span>}
                    <span className="mt-0.5 block text-[12px] text-inkt-zacht">
                      {formatDateTime(n.created_at)}
                      {!n.read_at && <span className="sr-only"> · ongelezen</span>}
                    </span>
                  </span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
