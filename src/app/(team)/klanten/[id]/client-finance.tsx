import { Plus } from 'lucide-react'
import { createExpenseAction, createQuoteAction } from '@/actions/finance'
import { financeEntries, totalsForYear } from '@/lib/finance'
import { formatEuro, todayISO } from '@/lib/format'
import type { Contract, Expense, Quote } from '@/lib/types'
import { Stat } from '@/components/ui'
import { FormDialog } from '@/components/ui/form'
import { ExpenseFields, QuoteFields, type Opt } from '@/components/forms'
import { ExpensesTable, QuotesTable } from '@/components/finance-tables'

export function ClientFinance({
  contracts,
  quotes,
  expenses,
  clientOpts,
  projOpts,
  clientId,
}: {
  contracts: Contract[]
  quotes: Quote[]
  expenses: Expense[]
  clientOpts: Opt[]
  projOpts: Opt[]
  clientId: string
}) {
  const today = todayISO()
  const year = Number(today.slice(0, 4))
  const entries = financeEntries(contracts, quotes, expenses).filter((e) => e.date <= today)
  const thisYear = totalsForYear(entries, year)
  const allTime = entries.reduce(
    (acc, e) => {
      if (e.kind === 'expenses') acc.expenses += e.amount
      else acc.revenue += e.amount
      return acc
    },
    { revenue: 0, expenses: 0 },
  )
  const margin = allTime.revenue > 0 ? Math.round(((allTime.revenue - allTime.expenses) / allTime.revenue) * 100) : null

  return (
    <div className="grid gap-8">
      <div>
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
          <Stat label={`Omzet ${year}`} value={formatEuro(thisYear.revenue)} hint={`${formatEuro(thisYear.retainers)} retainers · ${formatEuro(thisYear.quotes)} offertes`} />
          <Stat label={`Kosten ${year}`} value={formatEuro(thisYear.expenses)} />
          <Stat label="Omzet sinds start" value={formatEuro(allTime.revenue)} />
          <Stat tone="dark" label="Winst sinds start" value={formatEuro(allTime.revenue - allTime.expenses)} hint={margin != null ? `${margin}% marge` : undefined} />
        </div>
        <p className="mt-2 text-[13px] text-inkt-zacht">Tot en met vandaag, excl. btw. Toekomstige retainermaanden tellen nog niet mee.</p>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[20px] font-semibold">Offertes</h2>
          <FormDialog
            title="Nieuwe offerte"
            trigger={
              <>
                <Plus size={15} aria-hidden /> Offerte
              </>
            }
            triggerClassName="btn btn-primary btn-sm"
            action={createQuoteAction}
            wide
          >
            <QuoteFields quote={{ client_id: clientId }} clients={clientOpts} projects={projOpts} />
          </FormDialog>
        </div>
        <QuotesTable quotes={quotes} clientOpts={clientOpts} projOpts={projOpts} showClient={false} />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[20px] font-semibold">Kosten</h2>
          <FormDialog
            title="Nieuwe kost"
            trigger={
              <>
                <Plus size={15} aria-hidden /> Kost
              </>
            }
            triggerClassName="btn btn-primary btn-sm"
            action={createExpenseAction}
          >
            <ExpenseFields expense={{ client_id: clientId }} clients={clientOpts} projects={projOpts} />
          </FormDialog>
        </div>
        <ExpensesTable expenses={expenses} clientOpts={clientOpts} projOpts={projOpts} showClient={false} />
      </section>
    </div>
  )
}
