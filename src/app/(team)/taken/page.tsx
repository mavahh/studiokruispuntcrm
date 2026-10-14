import type { Metadata } from 'next'
import Link from 'next/link'
import { getTeam, requireTeam } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui'
import { TaskList, type TaskRow } from '@/components/task-list'

export const metadata: Metadata = { title: 'Mijn taken' }

export default async function MyTasksPage({ searchParams }: { searchParams: Promise<{ wie?: string; klaar?: string }> }) {
  const profile = await requireTeam()
  const { wie = profile.id, klaar } = await searchParams
  const supabase = await createClient()
  let query = supabase.from('tasks').select('*, projects(id, title, clients(name))')
  if (wie !== 'iedereen') query = query.eq('assignee_id', wie)
  if (!klaar) query = query.neq('status', 'klaar')
  const [{ data }, team] = await Promise.all([query, getTeam()])
  const tasks = (data ?? []) as TaskRow[]

  const filters = [
    { key: profile.id, label: 'Mijn taken' },
    ...team.filter((t) => t.id !== profile.id).map((t) => ({ key: t.id, label: t.full_name || t.email })),
    { key: 'iedereen', label: 'Iedereen' },
  ]

  return (
    <div className="animate-reveal">
      <PageHeader title="Taken" description="Alle open taken over projecten heen, gesorteerd op deadline." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={`/taken?wie=${f.key}${klaar ? '&klaar=1' : ''}`}
            className={`btn btn-sm ${wie === f.key ? 'bg-nacht text-white' : 'btn-secondary'}`}
          >
            {f.label}
          </Link>
        ))}
        <Link href={`/taken?wie=${wie}${klaar ? '' : '&klaar=1'}`} className="link ml-auto text-[13px]">
          {klaar ? 'Verberg afgewerkte' : 'Toon afgewerkte'}
        </Link>
      </div>
      <TaskList tasks={tasks} team={team} showProject emptyTitle="Geen open taken 🎉" />
    </div>
  )
}
