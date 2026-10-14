import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Pencil, Plus } from 'lucide-react'
import { createTaskAction, deleteProjectAction, setProjectStatusAction, updateProjectAction } from '@/actions/projects'
import { createExpenseAction } from '@/actions/finance'
import { getTeam } from '@/lib/auth'
import { PROJECT_STATUSES } from '@/lib/constants'
import { formatDate, formatEuro, relativeDays, todayISO } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import type { Expense, Project, Quote } from '@/lib/types'
import { Avatar, Card, PageHeader } from '@/components/ui'
import { AutoSelect, ConfirmButton, FormDialog } from '@/components/ui/form'
import { ExpenseFields, ProjectFields, TaskFields, clientOptions, projectOptions, teamOptions } from '@/components/forms'
import { ContentList, ViewToggle, type ContentRow } from '@/components/content-views'
import { TaskBoard, TaskList, type TaskRow } from '@/components/task-list'

type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ weergave?: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('projects').select('title').eq('id', id).single()
  return { title: data?.title ?? 'Project' }
}

export default async function ProjectPage({ params, searchParams }: Params) {
  const { id } = await params
  const { weergave = 'bord' } = await searchParams
  const supabase = await createClient()
  const [{ data: project }, team, tasks, content, quotes, expenses, { data: clients }] = await Promise.all([
    supabase.from('projects').select('*, clients(id, name)').eq('id', id).single<Project & { clients: { id: string; name: string } | null }>(),
    getTeam(),
    supabase.from('tasks').select('*').eq('project_id', id),
    supabase.from('content_items').select('*, content_comments(count)').eq('project_id', id),
    supabase.from('quotes').select('*').eq('project_id', id),
    supabase.from('expenses').select('*').eq('project_id', id).order('expense_date', { ascending: false }),
    supabase.from('clients').select('id, name').order('name'),
  ])
  if (!project) notFound()

  const taskRows = (tasks.data ?? []) as TaskRow[]
  const expenseRows = (expenses.data ?? []) as Expense[]
  const confirmed = ((quotes.data ?? []) as Quote[]).filter((q) => q.status === 'bevestigd')
  const spent = expenseRows.reduce((s, e) => s + Number(e.amount), 0)
  const invoiced = confirmed.reduce((s, q) => s + Number(q.amount), 0)
  const owner = team.find((t) => t.id === project.owner_id)
  const done = taskRows.filter((t) => t.status === 'klaar').length
  const today = todayISO()
  const late = project.deadline && project.deadline < today && project.status !== 'afgerond'
  const teamOpts = teamOptions(team)
  const clientOpts = clientOptions(clients ?? [])

  return (
    <div className="animate-reveal">
      <PageHeader
        eyebrow={
          <Link href="/projecten" className="hover:text-nacht">
            ← Projecten
          </Link>
        }
        title={project.title}
        description={
          project.clients ? (
            <Link href={`/klanten/${project.clients.id}`} className="link">
              {project.clients.name}
            </Link>
          ) : (
            'Intern project'
          )
        }
        actions={
          <>
            <AutoSelect
              label="Projectstatus"
              name="status"
              defaultValue={project.status}
              options={PROJECT_STATUSES}
              action={setProjectStatusAction.bind(null, id)}
              className="field h-10 w-auto py-0 font-semibold"
            />
            <FormDialog
              title="Project bewerken"
              trigger={
                <>
                  <Pencil size={16} aria-hidden /> Bewerken
                </>
              }
              triggerClassName="btn btn-secondary"
              action={updateProjectAction.bind(null, id)}
              wide
            >
              <ProjectFields project={project} clients={clientOpts} team={teamOpts} />
            </FormDialog>
          </>
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="card p-4">
          <div className="text-[12px] font-semibold text-inkt-zacht">Deadline</div>
          <div className={`mt-1 font-display text-[20px] font-bold ${late ? 'text-rood' : ''}`}>{formatDate(project.deadline)}</div>
          {project.deadline && project.status !== 'afgerond' && <div className="text-[13px] text-inkt-zacht">{relativeDays(project.deadline)}</div>}
        </div>
        <div className="card p-4">
          <div className="text-[12px] font-semibold text-inkt-zacht">Verantwoordelijke</div>
          <div className="mt-1.5 flex items-center gap-2 font-semibold">
            {owner ? (
              <>
                <Avatar name={owner.full_name || owner.email} size={26} /> {owner.full_name || owner.email}
              </>
            ) : (
              '—'
            )}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-[12px] font-semibold text-inkt-zacht">Budget</div>
          <div className="tabular mt-1 font-display text-[20px] font-bold">{formatEuro(project.budget)}</div>
          <div className="tabular text-[13px] text-inkt-zacht">
            {formatEuro(spent)} kosten{invoiced > 0 ? ` · ${formatEuro(invoiced)} bevestigd` : ''}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-[12px] font-semibold text-inkt-zacht">Taken</div>
          <div className="tabular mt-1 font-display text-[20px] font-bold">
            {done}/{taskRows.length}
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-hemel-soft">
            <div className="h-full rounded-full bg-mint" style={{ width: `${taskRows.length ? (done / taskRows.length) * 100 : 0}%` }} />
          </div>
        </div>
      </div>

      {project.description && (
        <Card title="Omschrijving" className="mb-8">
          <p className="whitespace-pre-line">{project.description}</p>
        </Card>
      )}

      <section className="mb-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-[22px] font-semibold">Taken</h2>
            <ViewToggle base={`/projecten/${id}`} view={weergave} />
          </div>
          <FormDialog
            title="Nieuwe taak"
            trigger={
              <>
                <Plus size={17} aria-hidden /> Taak
              </>
            }
            action={createTaskAction.bind(null, id)}
          >
            <TaskFields team={teamOpts} />
          </FormDialog>
        </div>
        {weergave === 'lijst' ? <TaskList tasks={taskRows} team={team} emptyTitle="Nog geen taken" /> : <TaskBoard tasks={taskRows} team={team} />}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-[20px] font-semibold">Content in dit project</h2>
          <ContentList items={(content.data ?? []) as ContentRow[]} team={team} showClient={false} />
        </section>
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[20px] font-semibold">Kosten</h2>
            <FormDialog
              title="Kost toevoegen"
              trigger={
                <>
                  <Plus size={15} aria-hidden /> Kost
                </>
              }
              triggerClassName="btn btn-secondary btn-sm"
              action={createExpenseAction}
            >
              <ExpenseFields expense={{ project_id: id, client_id: project.client_id }} clients={clientOpts} projects={projectOptions([project])} />
            </FormDialog>
          </div>
          {expenseRows.length === 0 ? (
            <p className="card p-5 text-inkt-zacht">Nog geen kosten op dit project.</p>
          ) : (
            <ul className="card divide-y divide-lijn">
              {expenseRows.map((e) => (
                <li key={e.id} className="flex justify-between gap-3 px-5 py-3">
                  <span>
                    {e.description}
                    <span className="block text-[13px] text-inkt-zacht">{formatDate(e.expense_date)}</span>
                  </span>
                  <span className="tabular font-semibold">{formatEuro(e.amount, true)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-10 flex justify-end border-t border-lijn pt-6">
        <ConfirmButton action={deleteProjectAction.bind(null, id)} confirm={`Project "${project.title}" en alle taken verwijderen?`}>
          Project verwijderen
        </ConfirmButton>
      </div>
    </div>
  )
}
