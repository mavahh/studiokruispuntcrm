'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { fail, num, ok, oneOf, str, type ActionState } from '@/lib/action-state'
import { formatDate } from '@/lib/format'
import { notify } from '@/lib/notify'
import type { Priority, ProjectStatus, TaskStatus } from '@/lib/types'
import { dbError, displayName, teamContext } from './_shared'

const PROJECT_STATUSES: ProjectStatus[] = ['gepland', 'lopend', 'review', 'afgerond', 'on_hold']
const TASK_STATUSES: TaskStatus[] = ['todo', 'bezig', 'review', 'klaar']
const PRIORITIES: Priority[] = ['laag', 'normaal', 'hoog']

function projectFields(fd: FormData) {
  return {
    title: str(fd, 'title'),
    client_id: str(fd, 'client_id'),
    description: str(fd, 'description'),
    budget: num(fd, 'budget'),
    deadline: str(fd, 'deadline'),
    owner_id: str(fd, 'owner_id'),
    status: oneOf(fd, 'status', PROJECT_STATUSES, 'gepland'),
  }
}

export async function createProjectAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, profile } = await teamContext()
  const f = projectFields(fd)
  if (!f.title) return fail('Geef het project een titel.')
  const { data, error } = await supabase.from('projects').insert(f).select('id').single()
  const msg = dbError(error)
  if (msg) return fail(msg)
  if (f.owner_id && f.owner_id !== profile.id) {
    await notify([f.owner_id], {
      title: `Nieuw project voor jou: ${f.title}`,
      body: `${displayName(profile)} maakte je verantwoordelijke.${f.deadline ? ` Deadline: ${formatDate(f.deadline)}.` : ''}`,
      link: `/projecten/${data!.id}`,
    })
  }
  revalidatePath('/', 'layout')
  redirect(`/projecten/${data!.id}`)
}

export async function updateProjectAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, profile } = await teamContext()
  const f = projectFields(fd)
  if (!f.title) return fail('Geef het project een titel.')
  const { data: before } = await supabase.from('projects').select('owner_id').eq('id', id).single()
  const msg = dbError((await supabase.from('projects').update(f).eq('id', id)).error)
  if (msg) return fail(msg)
  if (f.owner_id && f.owner_id !== before?.owner_id && f.owner_id !== profile.id) {
    await notify([f.owner_id], {
      title: `Je bent verantwoordelijke voor ${f.title}`,
      body: `${displayName(profile)} gaf dit project aan jou.`,
      link: `/projecten/${id}`,
    })
  }
  revalidatePath('/', 'layout')
  return ok()
}

export async function setProjectStatusAction(id: string, status: string) {
  const { supabase } = await teamContext()
  if (!(PROJECT_STATUSES as string[]).includes(status)) return
  await supabase.from('projects').update({ status }).eq('id', id)
  revalidatePath('/', 'layout')
}

export async function deleteProjectAction(id: string) {
  const { supabase } = await teamContext()
  await supabase.from('projects').delete().eq('id', id)
  revalidatePath('/', 'layout')
  redirect('/projecten')
}

// ─── Taken ─────────────────────────────────────────────────────────────────

async function notifyAssignee(
  assigneeId: string | null,
  actor: { id: string; full_name: string | null; email: string },
  task: { title: string; due_date: string | null },
  projectId: string,
) {
  if (!assigneeId || assigneeId === actor.id) return
  await notify([assigneeId], {
    title: `Nieuwe taak: ${task.title}`,
    body: `${displayName(actor)} gaf je deze taak.${task.due_date ? ` Deadline: ${formatDate(task.due_date)}.` : ''}`,
    link: `/projecten/${projectId}`,
  })
}

export async function createTaskAction(projectId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, profile } = await teamContext()
  const title = str(fd, 'title')
  if (!title) return fail('Geef de taak een titel.')
  const task = {
    project_id: projectId,
    title,
    description: str(fd, 'description'),
    status: oneOf(fd, 'status', TASK_STATUSES, 'todo'),
    priority: oneOf(fd, 'priority', PRIORITIES, 'normaal'),
    assignee_id: str(fd, 'assignee_id'),
    due_date: str(fd, 'due_date'),
    position: Date.now(),
  }
  const msg = dbError((await supabase.from('tasks').insert(task)).error)
  if (msg) return fail(msg)
  await notifyAssignee(task.assignee_id, profile, task, projectId)
  revalidatePath('/', 'layout')
  return ok()
}

export async function updateTaskAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, profile } = await teamContext()
  const title = str(fd, 'title')
  if (!title) return fail('Geef de taak een titel.')
  const { data: before } = await supabase.from('tasks').select('assignee_id, project_id').eq('id', id).single()
  if (!before) return fail('Taak niet gevonden.')
  const task = {
    title,
    description: str(fd, 'description'),
    status: oneOf(fd, 'status', TASK_STATUSES, 'todo'),
    priority: oneOf(fd, 'priority', PRIORITIES, 'normaal'),
    assignee_id: str(fd, 'assignee_id'),
    due_date: str(fd, 'due_date'),
  }
  const msg = dbError((await supabase.from('tasks').update(task).eq('id', id)).error)
  if (msg) return fail(msg)
  if (task.assignee_id !== before.assignee_id) await notifyAssignee(task.assignee_id, profile, task, before.project_id as string)
  revalidatePath('/', 'layout')
  return ok()
}

export async function moveTaskAction(id: string, status: string, position?: number) {
  const { supabase } = await teamContext()
  if (!(TASK_STATUSES as string[]).includes(status)) return
  await supabase
    .from('tasks')
    .update(position != null ? { status, position } : { status })
    .eq('id', id)
  revalidatePath('/', 'layout')
}

export async function assignTaskAction(id: string, assigneeId: string) {
  const { supabase, profile } = await teamContext()
  const value = assigneeId || null
  const { data: task } = await supabase.from('tasks').update({ assignee_id: value }).eq('id', id).select('title, due_date, project_id').single()
  if (task) await notifyAssignee(value, profile, task, task.project_id as string)
  revalidatePath('/', 'layout')
}

export async function toggleTaskDoneAction(id: string, done: boolean) {
  const { supabase } = await teamContext()
  await supabase.from('tasks').update({ status: done ? 'klaar' : 'todo' }).eq('id', id)
  revalidatePath('/', 'layout')
}

export async function deleteTaskAction(id: string) {
  const { supabase } = await teamContext()
  await supabase.from('tasks').delete().eq('id', id)
  revalidatePath('/', 'layout')
}
