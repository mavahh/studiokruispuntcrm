'use server'

import { revalidatePath } from 'next/cache'
import { fail, num, ok, oneOf, str, type ActionState } from '@/lib/action-state'
import { todayISO } from '@/lib/format'
import type { ExpenseCategory, QuoteStatus } from '@/lib/types'
import { dbError, teamContext } from './_shared'

const QUOTE_STATUSES: QuoteStatus[] = ['concept', 'verstuurd', 'bevestigd', 'afgewezen']
const CATEGORIES: ExpenseCategory[] = ['freelancer', 'materiaal', 'software', 'advertenties', 'verplaatsing', 'overig']

function quoteFields(fd: FormData) {
  const status = oneOf(fd, 'status', QUOTE_STATUSES, 'concept')
  let accepted = str(fd, 'accepted_date')
  if (status === 'bevestigd' && !accepted) accepted = todayISO()
  if (status !== 'bevestigd') accepted = null
  return {
    client_id: str(fd, 'client_id'),
    project_id: str(fd, 'project_id'),
    number: str(fd, 'number'),
    title: str(fd, 'title'),
    amount: num(fd, 'amount') ?? 0,
    status,
    issue_date: str(fd, 'issue_date') ?? todayISO(),
    accepted_date: accepted,
    notes: str(fd, 'notes'),
  }
}

function revalidate() {
  revalidatePath('/', 'layout')
}

export async function createQuoteAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await teamContext()
  const f = quoteFields(fd)
  if (!f.title) return fail('Geef de offerte een titel.')
  const msg = dbError((await supabase.from('quotes').insert(f)).error)
  if (msg) return fail(msg)
  revalidate()
  return ok()
}

export async function updateQuoteAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await teamContext()
  const f = quoteFields(fd)
  if (!f.title) return fail('Geef de offerte een titel.')
  const msg = dbError((await supabase.from('quotes').update(f).eq('id', id)).error)
  if (msg) return fail(msg)
  revalidate()
  return ok()
}

export async function setQuoteStatusAction(id: string, status: string) {
  const { supabase } = await teamContext()
  if (!(QUOTE_STATUSES as string[]).includes(status)) return
  const { data: q } = await supabase.from('quotes').select('accepted_date').eq('id', id).single()
  await supabase
    .from('quotes')
    .update({ status, accepted_date: status === 'bevestigd' ? (q?.accepted_date ?? todayISO()) : null })
    .eq('id', id)
  revalidate()
}

export async function deleteQuoteAction(id: string) {
  const { supabase } = await teamContext()
  await supabase.from('quotes').delete().eq('id', id)
  revalidate()
}

function expenseFields(fd: FormData) {
  return {
    client_id: str(fd, 'client_id'),
    project_id: str(fd, 'project_id'),
    description: str(fd, 'description'),
    category: oneOf(fd, 'category', CATEGORIES, 'overig'),
    amount: num(fd, 'amount') ?? 0,
    expense_date: str(fd, 'expense_date') ?? todayISO(),
  }
}

export async function createExpenseAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await teamContext()
  const f = expenseFields(fd)
  if (!f.description) return fail('Geef een omschrijving.')
  const msg = dbError((await supabase.from('expenses').insert(f)).error)
  if (msg) return fail(msg)
  revalidate()
  return ok()
}

export async function updateExpenseAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await teamContext()
  const f = expenseFields(fd)
  if (!f.description) return fail('Geef een omschrijving.')
  const msg = dbError((await supabase.from('expenses').update(f).eq('id', id)).error)
  if (msg) return fail(msg)
  revalidate()
  return ok()
}

export async function deleteExpenseAction(id: string) {
  const { supabase } = await teamContext()
  await supabase.from('expenses').delete().eq('id', id)
  revalidate()
}
