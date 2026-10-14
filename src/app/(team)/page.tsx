import Link from 'next/link'
import { AlertTriangle, ArrowRight, CalendarClock, MessageSquare } from 'lucide-react'
import { requireTeam } from '@/lib/auth'
import { CONTENT_STATUSES, CONTRACT_WARNING_DAYS, optionFor, TASK_STATUSES } from '@/lib/constants'
import { financeEntries, monthlyRecurring, quarterOf, quartersForYear } from '@/lib/finance'
import { addDaysISO, formatDate, formatDateTime, formatEuro, relativeDays, todayISO } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import type { ContentItem, Contract, Expense, Project, Quote, Task } from '@/lib/types'
import { Badge, Card, EmptyState, PageHeader, Stat } from '@/components/ui'

type Named = { name: string } | null

export default async function DashboardPage() {
  const profile = await requireTeam()
  const supabase = await createClient()
  const today = todayISO()
  const year = Number(today.slice(0, 4))

  const [clients, contracts, quotes, expenses, myTasks, projects, feedbackItems, upcoming, comments] = await Promise.all([
    supabase.from('clients').select('id, status'),
    supabase.from('contracts').select('*, clients(name)'),
    supabase.from('quotes').select('*').eq('status', 'bevestigd'),
    supabase.from('expenses').select('*'),
    supabase
      .from('tasks')
      .select('*, projects(id, title)')
      .eq('assignee_id', profile.id)
      .neq('status', 'klaar')
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(8),
    supabase
      .from('projects')
      .select('*, clients(name)')
      .not('status', 'in', '(afgerond,on_hold)')
      .not('deadline', 'is', null)
      .order('deadline')
      .limit(6),
    supabase.from('content_items').select('*, clients(name)').eq('status', 'feedback').order('updated_at', { ascending: false }).limit(6),
    supabase
      .from('content_items')
      .select('*, clients(name)')
      .gte('planned_date', today)
      .lte('planned_date', addDaysISO(today, 7))
      .neq('status', 'gepost')
      .order('planned_date')
      .limit(8),
    supabase
      .from('content_comments')
      .select('id, body, created_at, content_item_id, profiles(full_name, role), content_items(title, clients(name))')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const allContracts = (contracts.data ?? []) as (Contract & { clients: Named })[]
  const entries = financeEntries(allContracts, (quotes.data ?? []) as Quote[], (expenses.data ?? []) as Expense[])
  const currentQ = quarterOf(today)
  const quarter = quartersForYear(entries, year).find((q) => q.key === currentQ.key)!
  const mrr = monthlyRecurring(allContracts, today)
  const activeClients = (clients.data ?? []).filter((c) => c.status === 'actief').length

  const expiring = allContracts
    .filter((c) => c.status === 'actief' && c.end_date <= addDaysISO(today, CONTRACT_WARNING_DAYS))
    .sort((a, b) => a.end_date.localeCompare(b.end_date))

  type CommentRow = {
    id: string
    body: string
    created_at: string
    content_item_id: string
    profiles: { full_name: string | null; role: string } | null
    content_items: { title: string; clients: Named } | null
  }
  const clientFeedback = ((comments.data ?? []) as unknown as CommentRow[]).filter((c) => c.profiles?.role === 'client').slice(0, 5)

  const firstName = (profile.full_name || profile.email).split(' ')[0]

  return (
    <div className="animate-reveal">
      <PageHeader eyebrow={formatDate(today)} title={`Dag ${firstName}`} description="Dit vraagt vandaag je aandacht." />

      <div className="mb-6 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <Stat label="Actieve klanten" value={activeClients} />
        <Stat label="Maandelijkse retainers" value={formatEuro(mrr)} hint="per maand, excl. btw" />
        <Stat label={`Omzet ${currentQ.label}`} value={formatEuro(quarter.revenue)} hint={`${formatEuro(quarter.expenses)} kosten`} />
        <Stat tone="dark" label={`Winst ${currentQ.label}`} value={formatEuro(quarter.profit)} hint="omzet min kosten" />
      </div>

      {expiring.length > 0 && (
        <section className="mb-6 rounded-kaart border border-signaal/40 bg-signaal-soft p-5">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-[#9a4300]" aria-hidden />
            <h2 className="text-[17px] font-semibold">Contracten die bijna aflopen</h2>
          </div>
          <ul className="grid gap-2">
            {expiring.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-veld bg-white px-4 py-3">
                <div>
                  <Link href={`/klanten/${c.client_id}?tab=contracten`} className="font-semibold text-nacht hover:underline">
                    {c.clients?.name}
                  </Link>
                  <span className="text-inkt-zacht"> · {c.package} · {formatEuro(c.monthly_amount)}/maand</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[14px] font-semibold text-[#9a4300]">
                    {c.end_date < today ? `Verlopen op ${formatDate(c.end_date)}` : `Loopt af ${relativeDays(c.end_date)} (${formatDate(c.end_date, true)})`}
                  </span>
                  <Link href={`/klanten/${c.client_id}?tab=contracten`} className="btn btn-secondary btn-sm">
                    Verlengen
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="Mijn taken"
          actions={
            <Link href="/taken" className="link text-[13px]">
              Alles
            </Link>
          }
          padded={false}
        >
          {(myTasks.data ?? []).length === 0 ? (
            <div className="p-5">
              <EmptyState title="Niets op je lijst">Taken die aan jou toegewezen worden, verschijnen hier.</EmptyState>
            </div>
          ) : (
            <ul>
              {((myTasks.data ?? []) as (Task & { projects: { id: string; title: string } | null })[]).map((t) => {
                const late = t.due_date && t.due_date < today
                return (
                  <li key={t.id} className="border-t border-lijn first:border-t-0">
                    <Link href={`/projecten/${t.project_id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-papier">
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{t.title}</div>
                        <div className="truncate text-[13px] text-inkt-zacht">{t.projects?.title}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge tone={optionFor(TASK_STATUSES, t.status).tone}>{optionFor(TASK_STATUSES, t.status).label}</Badge>
                        {t.due_date && (
                          <span className={`text-[13px] font-semibold ${late ? 'text-rood' : 'text-inkt-zacht'}`}>{formatDate(t.due_date, true)}</span>
                        )}
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card
          title="Wacht op feedback van klant"
          actions={
            <Link href="/content?status=feedback" className="link text-[13px]">
              Alles
            </Link>
          }
          padded={false}
        >
          {(feedbackItems.data ?? []).length === 0 ? (
            <div className="p-5">
              <EmptyState title="Niets in afwachting">Zet content op "Feedback klant" en de klant krijgt een melding.</EmptyState>
            </div>
          ) : (
            <ul>
              {((feedbackItems.data ?? []) as (ContentItem & { clients: Named })[]).map((c) => (
                <li key={c.id} className="border-t border-lijn first:border-t-0">
                  <Link href={`/content/${c.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-papier">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{c.title}</div>
                      <div className="truncate text-[13px] text-inkt-zacht">{c.clients?.name}</div>
                    </div>
                    <span className="shrink-0 text-[13px] text-inkt-zacht">sinds {formatDate(c.updated_at, true)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recente feedback van klanten" padded={false}>
          {clientFeedback.length === 0 ? (
            <div className="p-5">
              <EmptyState title="Nog geen feedback">Opmerkingen uit het klantportaal komen hier binnen.</EmptyState>
            </div>
          ) : (
            <ul>
              {clientFeedback.map((c) => (
                <li key={c.id} className="border-t border-lijn first:border-t-0">
                  <Link href={`/content/${c.content_item_id}`} className="flex gap-3 px-5 py-3 hover:bg-papier">
                    <MessageSquare size={17} className="mt-0.5 shrink-0 text-hemel" aria-hidden />
                    <div className="min-w-0">
                      <div className="text-[13px] text-inkt-zacht">
                        <span className="font-semibold text-nacht">{c.content_items?.clients?.name}</span> over {c.content_items?.title} ·{' '}
                        {formatDateTime(c.created_at)}
                      </div>
                      <p className="line-clamp-2">{c.body}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Deze week gepland" padded={false}>
          {(upcoming.data ?? []).length === 0 ? (
            <div className="p-5">
              <EmptyState title="Geen geplande posts">Content met een plandatum in de komende 7 dagen verschijnt hier.</EmptyState>
            </div>
          ) : (
            <ul>
              {((upcoming.data ?? []) as (ContentItem & { clients: Named })[]).map((c) => {
                const s = optionFor(CONTENT_STATUSES, c.status)
                return (
                  <li key={c.id} className="border-t border-lijn first:border-t-0">
                    <Link href={`/content/${c.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-papier">
                      <CalendarClock size={17} className="shrink-0 text-hemel" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{c.title}</div>
                        <div className="truncate text-[13px] text-inkt-zacht">
                          {c.clients?.name} · {formatDate(c.planned_date, true)}
                        </div>
                      </div>
                      <Badge tone={s.tone}>{s.label}</Badge>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card
          title="Projectdeadlines"
          className="lg:col-span-2"
          actions={
            <Link href="/projecten" className="link text-[13px]">
              Alle projecten
            </Link>
          }
          padded={false}
        >
          {(projects.data ?? []).length === 0 ? (
            <div className="p-5">
              <EmptyState title="Geen lopende deadlines" />
            </div>
          ) : (
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3">
              {((projects.data ?? []) as (Project & { clients: Named })[]).map((p) => {
                const late = p.deadline! < today
                return (
                  <li key={p.id} className="border-t border-lijn">
                    <Link href={`/projecten/${p.id}`} className="flex h-full items-center justify-between gap-3 px-5 py-3.5 hover:bg-papier">
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{p.title}</div>
                        <div className={`text-[13px] ${late ? 'font-semibold text-rood' : 'text-inkt-zacht'}`}>
                          {p.clients?.name ?? 'Intern'} · {formatDate(p.deadline, true)} ({relativeDays(p.deadline)})
                        </div>
                      </div>
                      <ArrowRight size={16} className="shrink-0 text-hemel" aria-hidden />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
