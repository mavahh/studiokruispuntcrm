import Link from 'next/link'
import { CalendarDays, ExternalLink, MessageSquare } from 'lucide-react'
import { setContentStatusAction } from '@/actions/content'
import { CONTENT_STATUSES, CONTENT_TYPES, optionFor } from '@/lib/constants'
import { formatDate, todayISO } from '@/lib/format'
import type { ContentItem, Profile } from '@/lib/types'
import { Avatar, Badge, EmptyState, Table } from './ui'
import { Kanban } from './kanban'

export type ContentRow = ContentItem & {
  clients?: { name: string } | null
  content_comments?: { count: number }[]
}

function typeLabel(t: ContentItem['type']) {
  return CONTENT_TYPES.find((x) => x.value === t)?.label ?? t
}

function commentCount(item: ContentRow) {
  return item.content_comments?.[0]?.count ?? 0
}

function ContentCard({ item, showClient, team }: { item: ContentRow; showClient: boolean; team: Profile[] }) {
  const assignee = team.find((p) => p.id === item.assignee_id)
  const today = todayISO()
  const late = item.planned_date && item.planned_date < today && !['ingepland', 'gepost'].includes(item.status)
  const comments = commentCount(item)
  return (
    <div>
      {showClient && item.clients && <div className="mb-1 truncate text-[12px] font-semibold text-inkt-zacht">{item.clients.name}</div>}
      <Link href={`/content/${item.id}`} className="block leading-snug font-semibold text-nacht hover:underline" draggable={false}>
        {item.title}
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px] text-inkt-zacht">
        <Badge tone="muted">{typeLabel(item.type)}</Badge>
        {item.planned_date && (
          <span className={`inline-flex items-center gap-1 ${late ? 'font-semibold text-rood' : ''}`}>
            <CalendarDays size={13} aria-hidden />
            {formatDate(item.planned_date, true)}
          </span>
        )}
        {comments > 0 && (
          <span className="inline-flex items-center gap-1">
            <MessageSquare size={13} aria-hidden />
            {comments}
          </span>
        )}
        {item.drive_url && (
          <a href={item.drive_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-groen hover:underline" draggable={false}>
            <ExternalLink size={13} aria-hidden />
            Drive
          </a>
        )}
        {assignee && (
          <span className="ml-auto">
            <Avatar name={assignee.full_name || assignee.email} size={22} />
          </span>
        )}
      </div>
    </div>
  )
}

export function ContentBoard({ items, team, showClient = true }: { items: ContentRow[]; team: Profile[]; showClient?: boolean }) {
  return (
    <Kanban
      columns={CONTENT_STATUSES}
      onMove={setContentStatusAction}
      items={items.map((item) => ({ id: item.id, status: item.status, node: <ContentCard item={item} showClient={showClient} team={team} /> }))}
    />
  )
}

export function ContentList({ items, team, showClient = true }: { items: ContentRow[]; team: Profile[]; showClient?: boolean }) {
  if (items.length === 0) return <EmptyState title="Geen content gevonden" />
  const sorted = [...items].sort((a, b) => (a.planned_date ?? '9999').localeCompare(b.planned_date ?? '9999'))
  return (
    <div className="card overflow-hidden">
      <Table>
        <thead>
          <tr>
            <th>Titel</th>
            {showClient && <th className="hidden md:table-cell">Klant</th>}
            <th>Status</th>
            <th className="hidden sm:table-cell">Plandatum</th>
            <th className="hidden lg:table-cell">Platformen</th>
            <th className="hidden md:table-cell">Wie</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((item) => {
            const s = optionFor(CONTENT_STATUSES, item.status)
            const assignee = team.find((p) => p.id === item.assignee_id)
            return (
              <tr key={item.id} className="hover:bg-papier">
                <td>
                  <Link href={`/content/${item.id}`} className="font-semibold text-nacht hover:underline">
                    {item.title}
                  </Link>
                  <div className="text-[13px] text-inkt-zacht">{typeLabel(item.type)}</div>
                </td>
                {showClient && <td className="hidden md:table-cell">{item.clients?.name}</td>}
                <td>
                  <Badge tone={s.tone}>{s.label}</Badge>
                </td>
                <td className="tabular hidden sm:table-cell">{formatDate(item.planned_date)}</td>
                <td className="hidden text-[13px] text-inkt-zacht lg:table-cell">{item.platforms.join(', ') || '—'}</td>
                <td className="hidden md:table-cell">{assignee ? <Avatar name={assignee.full_name || assignee.email} size={24} /> : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </Table>
    </div>
  )
}

export function ViewToggle({ base, view, params = {} }: { base: string; view: string; params?: Record<string, string | undefined> }) {
  const make = (v: string) => {
    const sp = new URLSearchParams()
    for (const [k, val] of Object.entries(params)) if (val) sp.set(k, val)
    sp.set('weergave', v)
    return `${base}?${sp.toString()}`
  }
  return (
    <div className="inline-flex rounded-full border border-lijn bg-white p-0.5" role="group" aria-label="Weergave">
      {[
        { v: 'bord', label: 'Bord' },
        { v: 'lijst', label: 'Lijst' },
      ].map((o) => (
        <Link
          key={o.v}
          href={make(o.v)}
          scroll={false}
          aria-current={view === o.v ? 'true' : undefined}
          className={`rounded-full px-3.5 py-1 text-[13px] font-semibold transition-colors duration-150 ${
            view === o.v ? 'bg-nacht text-white' : 'text-inkt-zacht hover:text-nacht'
          }`}
        >
          {o.label}
        </Link>
      ))}
    </div>
  )
}
