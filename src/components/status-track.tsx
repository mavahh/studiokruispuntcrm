import { CONTENT_STATUSES } from '@/lib/constants'
import type { ContentStatus } from '@/lib/types'

/** De 8 stappen van idee tot gepost, met de huidige stap gemarkeerd. */
export function StatusTrack({ status }: { status: ContentStatus }) {
  const index = CONTENT_STATUSES.findIndex((s) => s.value === status)
  return (
    <ol className="grid grid-cols-4 gap-1.5 sm:grid-cols-8" aria-label="Voortgang">
      {CONTENT_STATUSES.map((s, i) => {
        const done = i < index
        const current = i === index
        return (
          <li key={s.value} aria-current={current ? 'step' : undefined}>
            <div className={`h-1.5 rounded-full ${done ? 'bg-mint' : current ? (s.value === 'feedback' ? 'bg-signaal' : 'bg-blauw') : 'bg-lijn'}`} />
            <div className={`mt-1.5 text-[12px] ${current ? 'font-bold text-nacht' : done ? 'text-inkt-zacht' : 'text-inkt-zacht/70'}`}>{s.label}</div>
          </li>
        )
      })}
    </ol>
  )
}
