import { RefreshCw } from 'lucide-react'
import { deleteContractAction, renewContractAction, updateContractAction } from '@/actions/contracts'
import { CONTRACT_STATUSES, CONTRACT_WARNING_DAYS, optionFor } from '@/lib/constants'
import { contractTotal } from '@/lib/finance'
import { addDaysISO, daysBetween, formatDate, formatEuro, relativeDays, todayISO } from '@/lib/format'
import type { Contract } from '@/lib/types'
import { Badge, EmptyState } from '@/components/ui'
import { ConfirmButton, FormDialog } from '@/components/ui/form'
import { ContractFields } from '@/components/forms'
import { Grid, TextField } from '@/components/ui/fields'

export function contractState(c: Contract, today = todayISO()) {
  if (c.status !== 'actief') return { label: optionFor(CONTRACT_STATUSES, c.status).label, tone: 'muted' as const }
  if (c.end_date < today) return { label: 'Verlopen', tone: 'danger' as const }
  if (c.start_date > today) return { label: 'Start binnenkort', tone: 'neutral' as const }
  if (c.end_date <= addDaysISO(today, CONTRACT_WARNING_DAYS)) return { label: 'Loopt bijna af', tone: 'signal' as const }
  return { label: 'Actief', tone: 'mint' as const }
}

export function RenewButton({ contract }: { contract: Contract }) {
  const start = addDaysISO(contract.end_date, 1)
  const end = addDaysISO(start, daysBetween(contract.start_date, contract.end_date))
  return (
    <FormDialog
      title="Contract verlengen"
      description="Maakt een nieuw contract aan dat aansluit op het huidige. Het huidige krijgt de status 'Verlengd'."
      trigger={
        <>
          <RefreshCw size={14} aria-hidden /> Verlengen
        </>
      }
      triggerClassName="btn btn-primary btn-sm"
      action={renewContractAction.bind(null, contract.id)}
      submitLabel="Verlengen"
    >
      <Grid>
        <TextField label="Pakket" name="package" defaultValue={contract.package} />
        <TextField label="Bedrag per maand (excl. btw)" name="monthly_amount" type="number" step="0.01" min="0" defaultValue={contract.monthly_amount} />
        <TextField label="Nieuwe startdatum" name="start_date" type="date" defaultValue={start} />
        <TextField label="Nieuwe einddatum" name="end_date" type="date" defaultValue={end} />
      </Grid>
    </FormDialog>
  )
}

export function ContractsTable({ contracts, compact = false }: { contracts: Contract[]; compact?: boolean }) {
  const today = todayISO()
  if (contracts.length === 0) return <EmptyState title="Nog geen contracten">Voeg een retainer toe om de maandelijkse omzet en de einddatum op te volgen.</EmptyState>

  if (compact) {
    const c = contracts[0]!
    const state = contractState(c, today)
    const total = Math.max(1, daysBetween(c.start_date, c.end_date))
    const done = Math.min(total, Math.max(0, daysBetween(c.start_date, today)))
    return (
      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-[13px] text-inkt-zacht">
          <span>{formatDate(c.start_date, true)}</span>
          <span>{formatDate(c.end_date, true)}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-hemel-soft" role="img" aria-label={`${Math.round((done / total) * 100)}% van de looptijd voorbij`}>
          <div className={`h-full rounded-full ${state.tone === 'signal' || state.tone === 'danger' ? 'bg-signaal' : 'bg-mint'}`} style={{ width: `${(done / total) * 100}%` }} />
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <Badge tone={state.tone}>{state.label}</Badge>
          <span className="text-[13px] font-semibold">eindigt {relativeDays(c.end_date)}</span>
        </div>
        {(state.tone === 'signal' || state.tone === 'danger') && (
          <div className="mt-3">
            <RenewButton contract={c} />
          </div>
        )}
      </div>
    )
  }

  return (
    <ul className="grid gap-3">
      {contracts.map((c) => {
        const state = contractState(c, today)
        return (
          <li key={c.id} className="card flex flex-col gap-4 p-5 md:flex-row md:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-[18px] font-bold">{c.package}</span>
                <Badge tone={state.tone}>{state.label}</Badge>
              </div>
              <div className="tabular mt-1 text-[14px] text-inkt-zacht">
                {formatEuro(c.monthly_amount)}/maand · {formatDate(c.start_date)} → {formatDate(c.end_date)} · totaal {formatEuro(contractTotal(c))}
              </div>
              {c.notes && <p className="mt-1 text-[14px]">{c.notes}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {c.status === 'actief' && <RenewButton contract={c} />}
              <FormDialog title="Contract bewerken" trigger="Bewerken" triggerClassName="btn btn-secondary btn-sm" action={updateContractAction.bind(null, c.id)}>
                <ContractFields contract={c} clientId={c.client_id} />
              </FormDialog>
              <ConfirmButton action={deleteContractAction.bind(null, c.id)} confirm="Dit contract verwijderen? De omzet ervan verdwijnt uit de cijfers.">
                Verwijderen
              </ConfirmButton>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
