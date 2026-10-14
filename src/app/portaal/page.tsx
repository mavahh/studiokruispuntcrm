import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, FolderOpen } from 'lucide-react'
import { requireClient } from '@/lib/auth'
import { CONTENT_STATUSES, CONTENT_TYPES, optionFor } from '@/lib/constants'
import { formatDate } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import type { ContentItem } from '@/lib/types'
import { Badge, EmptyState, PageHeader } from '@/components/ui'

export const metadata: Metadata = { title: 'Jouw content' }

type Row = ContentItem & { content_comments: { count: number }[] }

export default async function PortalHome() {
  const profile = await requireClient()
  const supabase = await createClient()
  const [{ data: client }, { data }] = await Promise.all([
    supabase.from('clients').select('name, drive_url').eq('id', profile.client_id).single(),
    supabase.from('content_items').select('*, content_comments(count)').eq('client_id', profile.client_id).order('planned_date', { ascending: true, nullsFirst: false }),
  ])
  const items = (data ?? []) as Row[]
  const waiting = items.filter((i) => i.status === 'feedback')
  const inProduction = items.filter((i) => ['idee', 'script', 'opname', 'montage'].includes(i.status))
  const ready = items.filter((i) => ['goedgekeurd', 'ingepland'].includes(i.status))
  const posted = items.filter((i) => i.status === 'gepost').reverse()
  const firstName = (profile.full_name || '').split(' ')[0]

  return (
    <div className="animate-reveal">
      <PageHeader
        eyebrow={client?.name}
        title={firstName ? `Dag ${firstName}` : 'Jouw content'}
        description="Hier volg je al je posts en video's op, van idee tot online."
        actions={
          client?.drive_url ? (
            <a href={client.drive_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              <FolderOpen size={17} aria-hidden /> Drive-map
            </a>
          ) : undefined
        }
      />

      <section className="mb-10">
        <h2 className="mb-3 flex items-center gap-2 text-[20px] font-semibold">
          Wacht op jouw feedback {waiting.length > 0 && <Badge tone="signal">{waiting.length}</Badge>}
        </h2>
        {waiting.length === 0 ? (
          <EmptyState title="Alles is bekeken">Zodra er iets klaarstaat om na te kijken, krijg je een melding.</EmptyState>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {waiting.map((i) => (
              <li key={i.id}>
                <Link
                  href={`/portaal/${i.id}`}
                  className="flex h-full flex-col rounded-kaart bg-blauw p-5 text-white transition-transform duration-150 active:scale-[0.99]"
                >
                  <span className="text-[12px] font-semibold tracking-[0.08em] text-mint uppercase">{CONTENT_TYPES.find((t) => t.value === i.type)?.label}</span>
                  <span className="mt-1 font-display text-[19px] leading-snug font-bold">{i.title}</span>
                  <span className="mt-auto flex items-center gap-1.5 pt-4 text-[14px] font-semibold text-mint">
                    Bekijken en feedback geven <ArrowRight size={16} aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Group title="Goedgekeurd & ingepland" items={ready} empty="Nog niets ingepland." />
      <Group title="In productie" items={inProduction} empty="Er staat momenteel niets in productie." />
      <Group title="Online" items={posted} empty="Nog niets gepost." />
    </div>
  )
}

function Group({ title, items, empty }: { title: string; items: Row[]; empty: string }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-[20px] font-semibold">{title}</h2>
      {items.length === 0 ? (
        <p className="text-inkt-zacht">{empty}</p>
      ) : (
        <ul className="card divide-y divide-lijn overflow-hidden">
          {items.map((i) => {
            const s = optionFor(CONTENT_STATUSES, i.status)
            const comments = i.content_comments?.[0]?.count ?? 0
            return (
              <li key={i.id}>
                <Link href={`/portaal/${i.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-papier">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{i.title}</div>
                    <div className="text-[13px] text-inkt-zacht">
                      {CONTENT_TYPES.find((t) => t.value === i.type)?.label}
                      {i.planned_date && ` · ${formatDate(i.planned_date)}`}
                      {comments > 0 && ` · ${comments} ${comments === 1 ? 'bericht' : 'berichten'}`}
                    </div>
                  </div>
                  <Badge tone={s.tone}>{s.label}</Badge>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
