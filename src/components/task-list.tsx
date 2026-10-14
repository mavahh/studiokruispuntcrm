import Link from 'next/link'
import { assignTaskAction, deleteTaskAction, moveTaskAction, updateTaskAction } from '@/actions/projects'
import { PRIORITIES, TASK_STATUSES, optionFor } from '@/lib/constants'
import { formatDate, relativeDays, todayISO } from '@/lib/format'
import type { Profile, Task } from '@/lib/types'
import { Avatar, Badge, EmptyState } from './ui'
import { AutoSelect, ConfirmButton, FormDialog } from './ui/form'
import { Kanban } from './kanban'
import { TaskCheck } from './task-check'
import { TaskFields, teamOptions } from './forms'

export type TaskRow = Task & { projects?: { id: string; title: string; clients?: { name: string } | null } | null }

function TaskMeta({ task, team, showProject }: { task: TaskRow; team: Profile[]; showProject: boolean }) {
  const today = todayISO()
  const late = task.due_date && task.due_date < today && task.status !== 'klaar'
  const prio = optionFor(PRIORITIES, task.priority)
  const assignee = team.find((p) => p.id === task.assignee_id)
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-inkt-zacht">
      {showProject && task.projects && (
        <Link href={`/projecten/${task.projects.id}`} className="font-semibold hover:text-nacht hover:underline">
          {task.projects.title}
          {task.projects.clients?.name ? ` · ${task.projects.clients.name}` : ''}
        </Link>
      )}
      {task.priority !== 'normaal' && <Badge tone={prio.tone}>{prio.label}</Badge>}
      {task.due_date && (
        <span className={late ? 'font-semibold text-rood' : ''}>
          {formatDate(task.due_date, true)}
          {task.status !== 'klaar' && ` · ${relativeDays(task.due_date)}`}
        </span>
      )}
      {assignee && <Avatar name={assignee.full_name || assignee.email} size={20} />}
    </div>
  )
}

function EditTask({ task, team }: { task: TaskRow; team: Profile[] }) {
  return (
    <FormDialog title="Taak bewerken" trigger="Bewerken" triggerClassName="btn btn-ghost btn-sm" action={updateTaskAction.bind(null, task.id)}>
      <TaskFields task={task} team={teamOptions(team)} />
    </FormDialog>
  )
}

export function TaskBoard({ tasks, team }: { tasks: TaskRow[]; team: Profile[] }) {
  return (
    <Kanban
      columns={TASK_STATUSES}
      onMove={moveTaskAction}
      items={[...tasks]
        .sort((a, b) => a.position - b.position)
        .map((t) => ({
          id: t.id,
          status: t.status,
          node: (
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className={`leading-snug font-semibold ${t.status === 'klaar' ? 'text-inkt-zacht line-through' : ''}`}>{t.title}</span>
              </div>
              {t.description && <p className="mt-1 line-clamp-2 text-[13px] text-inkt-zacht">{t.description}</p>}
              <TaskMeta task={t} team={team} showProject={false} />
              <div className="-mb-1 mt-1 flex justify-end">
                <EditTask task={t} team={team} />
              </div>
            </div>
          ),
        }))}
    />
  )
}

export function TaskList({ tasks, team, showProject = false, emptyTitle = 'Geen taken' }: { tasks: TaskRow[]; team: Profile[]; showProject?: boolean; emptyTitle?: string }) {
  if (tasks.length === 0) return <EmptyState title={emptyTitle} />
  const sorted = [...tasks].sort((a, b) => {
    if ((a.status === 'klaar') !== (b.status === 'klaar')) return a.status === 'klaar' ? 1 : -1
    return (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999')
  })
  const teamOpts = [{ value: '', label: 'Niemand' }, ...teamOptions(team)]
  return (
    <ul className="card divide-y divide-lijn">
      {sorted.map((t) => (
        <li key={t.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="pt-0.5">
              <TaskCheck id={t.id} done={t.status === 'klaar'} title={t.title} />
            </div>
            <div className="min-w-0">
              <div className={`font-semibold ${t.status === 'klaar' ? 'text-inkt-zacht line-through' : ''}`}>{t.title}</div>
              {t.description && <p className="line-clamp-1 text-[13px] text-inkt-zacht">{t.description}</p>}
              <TaskMeta task={t} team={team} showProject={showProject} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 pl-9 sm:pl-0">
            <AutoSelect label="Status" name="status" defaultValue={t.status} options={TASK_STATUSES} action={moveTaskAction.bind(null, t.id)} />
            <AutoSelect label="Toegewezen aan" name="assignee_id" defaultValue={t.assignee_id ?? ''} options={teamOpts} action={assignTaskAction.bind(null, t.id)} />
            <EditTask task={t} team={team} />
            <ConfirmButton action={deleteTaskAction.bind(null, t.id)} confirm={`Taak "${t.title}" verwijderen?`} className="btn btn-ghost btn-sm text-rood">
              Verwijderen
            </ConfirmButton>
          </div>
        </li>
      ))}
    </ul>
  )
}
