'use server'

import { revalidatePath } from 'next/cache'
import { fail, num, ok, oneOf, str, type ActionState } from '@/lib/action-state'
import { addDaysISO, daysBetween } from '@/lib/format'
import type { Contract, ContractStatus } from '@/lib/types'
import { dbError, teamContext } from './_shared'

const STATUSES: ContractStatus[] = ['actief', 'verlengd', 'gestopt']

function fields(fd: FormData) {
  return {
    client_id: str(fd, 'client_id'),
    package: str(fd, 'package'),
    monthly_amount: num(fd, 'monthly_amount') ?? 0,
    start_date: str(fd, 'start_date'),
    end_date: str(fd, 'end_date'),
    status: oneOf(fd, 'status', STATUSES, 'actief'),
    notes: str(fd, 'notes'),
  }
}

function validate(f: ReturnType<typeof fields>) {
  if (!f.client_id) return 'Kies een klant.'
  if (!f.package) return 'Geef het pakket een naam.'
  if (!f.start_date || !f.end_date) return 'Vul een start- en einddatum in.'
  if (f.end_date < f.start_date) return 'De einddatum ligt vóór de startdatum.'
  if (f.monthly_amount < 0) return 'Het bedrag kan niet negatief zijn.'
  return null
}

function revalidate() {
  revalidatePath('/', 'layout')
}

export async function createContractAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await teamContext()
  const f = fields(fd)
  const invalid = validate(f)
  if (invalid) return fail(invalid)
  const msg = dbError((await supabase.from('contracts').insert(f)).error)
  if (msg) return fail(msg)
  revalidate()
  return ok()
}

export async function updateContractAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await teamContext()
  const f = fields(fd)
  const invalid = validate(f)
  if (invalid) return fail(invalid)
  const msg = dbError((await supabase.from('contracts').update(f).eq('id', id)).error)
  if (msg) return fail(msg)
  revalidate()
  return ok()
}

export async function deleteContractAction(id: string) {
  const { supabase } = await teamContext()
  await supabase.from('contracts').delete().eq('id', id)
  revalidate()
}

/** Verlengt een contract: nieuw contract vanaf de dag na het einde, met dezelfde looptijd. */
export async function renewContractAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await teamContext()
  const { data: old } = await supabase.from('contracts').select('*').eq('id', id).single<Contract>()
  if (!old) return fail('Contract niet gevonden.')
  const start = str(fd, 'start_date') ?? addDaysISO(old.end_date, 1)
  const end = str(fd, 'end_date') ?? addDaysISO(start, daysBetween(old.start_date, old.end_date))
  const amount = num(fd, 'monthly_amount') ?? Number(old.monthly_amount)
  if (end < start) return fail('De einddatum ligt vóór de startdatum.')

  const { error } = await supabase.from('contracts').insert({
    client_id: old.client_id,
    package: str(fd, 'package') ?? old.package,
    monthly_amount: amount,
    start_date: start,
    end_date: end,
    status: 'actief',
    notes: old.notes,
  })
  const msg = dbError(error)
  if (msg) return fail(msg)
  await supabase.from('contracts').update({ status: 'verlengd' }).eq('id', id)
  revalidate()
  return ok()
}
