import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createContractAction, deleteContractAction, updateContractAction } from '@/actions/contracts'
import { CONTRACT_WARNING_DAYS } from '@/lib/constants'
import { monthlyRecurring } from '@/lib/finance'
import { addDaysISO, formatDate, formatEuro, relativeDays, todayISO } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import type { Contract } from '@/lib/types'
import { Badge, EmptyState, PageHeader, Stat, Table } from '@/components/ui'
import { ConfirmButton, FormDialog } from '@/components/ui/form'
import { ContractFields, clientOptions } from '@/components/forms'
import { RenewButton, contractState } from '../klanten/[id]/contracts-table'

export const metadata: Metadata = { title: 'Contracten' }

type Row = Contract & { clients: { name: string } | null }

export default async function ContractsPage() {
  const supabase = await createClient()
  const [{ data }, { data: clients }] = await Promise.all([
    supabase.from('contracts').select('*, clients(name)').order('end_date'),
    supabase.from('clients').select('id, name').order('name'),
  ])
  const contracts = (data ?? []) as Row[]
  const today = todayISO()
  const warnBy = addDaysISO(today, CONTRACT_WARNING_DAYS)
  const attention = contracts.filter((c) => c.status === 'actief' && c.end_date <= warnBy)
  const running = contracts.filter((c) => c.status === 'actief' && c.end_date > warnBy)
  const past = contracts.filter((c) => c.status !== 'actief').reverse()
  const clientOpts = clientOptions(clients ?? [])

  return (
    <div className="animate-reveal">
      <PageHeader
        title="Contracten"
        description={`Retainers en hun looptijd. Contracten die binnen ${CONTRACT_WARNING_DAYS} dagen aflopen, staan bovenaan.`}
        actions={
          <FormDialog
            title="Nieuw contract"
            trigger={
              <>
                <Plus size={17} aria-hidden /> Nieuw contract
              </>
            }
            action={createContractAction}
          >
            <ContractFields clients={clientOpts} />
          </FormDialog>
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        <Stat label="Maandelijks terugkerend" value={formatEuro(monthlyRecurring(contracts, today))} hint="lopende retainers, excl. btw" />
        <Stat label="Lopende contracten" value={attention.length + running.length} />
        <Stat tone="dark" label="Actie nodig" value={attention.length} hint={attention.length ? 'verlengen of afronden' : 'alles in orde'} />
      </div>

      <Section title="Actie nodig" rows={attention} today={today} clientOpts={clientOpts} empty="Geen contracten die binnenkort aflopen." highlight />
      <Section title="Lopend" rows={running} today={today} clientOpts={clientOpts} empty="Geen lopende contracten." />
      {past.length > 0 && <Section title="Afgelopen & verlengd" rows={past} today={today} clientOpts={clientOpts} empty="" />}
    </div>
  )
}

function Section({
  title,
  rows,
  today,
  clientOpts,
  empty,
  highlight,
}: {
  title: string
  rows: Row[]
  today: string
  clientOpts: { value: string; label: string }[]
  empty: string
  highlight?: boolean
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-[20px] font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <EmptyState title={empty} />
      ) : (
        <div className={`card overflow-hidden ${highlight ? 'border-signaal/50' : ''}`}>
          <Table>
            <thead>
              <tr>
                <th>Klant</th>
                <th className="hidden sm:table-cell">Pakket</th>
                <th className="text-right">Per maand</th>
                <th>Einde</th>
                <th className="w-0">
                  <span className="sr-only">Acties</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const state = contractState(c, today)
                return (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/klanten/${c.client_id}?tab=contracten`} className="font-semibold hover:underline">
                        {c.clients?.name}
                      </Link>
                      <div className="sm:hidden text-[13px] text-inkt-zacht">{c.package}</div>
                    </td>
                    <td className="hidden sm:table-cell">{c.package}</td>
                    <td className="tabular text-right">{formatEuro(c.monthly_amount)}</td>
                    <td>
                      <div className="tabular">{formatDate(c.end_date)}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <Badge tone={state.tone}>{state.label}</Badge>
                        {c.status === 'actief' && <span className="text-[12px] text-inkt-zacht">{relativeDays(c.end_date)}</span>}
                      </div>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1.5">
                        {c.status === 'actief' && <RenewButton contract={c} />}
                        <FormDialog title="Contract bewerken" trigger="Bewerken" triggerClassName="btn btn-secondary btn-sm" action={updateContractAction.bind(null, c.id)}>
                          <ContractFields contract={c} clients={clientOpts} />
                        </FormDialog>
                        <ConfirmButton action={deleteContractAction.bind(null, c.id)} confirm="Dit contract verwijderen?" className="btn btn-ghost btn-sm text-rood">
                          Verwijderen
                        </ConfirmButton>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        </div>
      )}
    </section>
  )
}
