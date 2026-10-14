import { deleteExpenseAction, deleteQuoteAction, setQuoteStatusAction, updateExpenseAction, updateQuoteAction } from '@/actions/finance'
import { EXPENSE_CATEGORIES, QUOTE_STATUSES } from '@/lib/constants'
import { formatDate, formatEuro } from '@/lib/format'
import type { Expense, Quote } from '@/lib/types'
import { EmptyState, Table } from './ui'
import { AutoSelect, ConfirmButton, FormDialog } from './ui/form'
import { ExpenseFields, QuoteFields, type Opt } from './forms'

type Named = { clients?: { name: string } | null }

export function QuotesTable({ quotes, clientOpts, projOpts, showClient = true }: { quotes: (Quote & Named)[]; clientOpts: Opt[]; projOpts: Opt[]; showClient?: boolean }) {
  if (quotes.length === 0) return <EmptyState title="Geen offertes">Bevestigde offertes tellen mee als omzet op de datum van bevestiging.</EmptyState>
  return (
    <div className="card overflow-hidden">
      <Table>
        <thead>
          <tr>
            <th>Offerte</th>
            {showClient && <th className="hidden md:table-cell">Klant</th>}
            <th className="hidden sm:table-cell">Datum</th>
            <th>Status</th>
            <th className="text-right">Bedrag</th>
            <th className="w-0">
              <span className="sr-only">Acties</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {quotes.map((q) => (
            <tr key={q.id}>
              <td>
                <div className="font-semibold">{q.title}</div>
                {q.number && <div className="text-[13px] text-inkt-zacht">{q.number}</div>}
              </td>
              {showClient && <td className="hidden md:table-cell">{q.clients?.name ?? '—'}</td>}
              <td className="tabular hidden text-[13px] sm:table-cell">
                {formatDate(q.issue_date, true)}
                {q.accepted_date && <div className="text-groen">✓ {formatDate(q.accepted_date, true)}</div>}
              </td>
              <td>
                <AutoSelect
                  label="Status offerte"
                  name="status"
                  defaultValue={q.status}
                  options={QUOTE_STATUSES}
                  action={setQuoteStatusAction.bind(null, q.id)}
                />
              </td>
              <td className="tabular text-right font-semibold">{formatEuro(q.amount, true)}</td>
              <td>
                <div className="flex justify-end gap-1.5">
                  <FormDialog title="Offerte bewerken" trigger="Bewerken" triggerClassName="btn btn-secondary btn-sm" action={updateQuoteAction.bind(null, q.id)} wide>
                    <QuoteFields quote={q} clients={clientOpts} projects={projOpts} />
                  </FormDialog>
                  <ConfirmButton action={deleteQuoteAction.bind(null, q.id)} confirm={`Offerte "${q.title}" verwijderen?`} className="btn btn-ghost btn-sm text-rood">
                    Verwijderen
                  </ConfirmButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  )
}

export function ExpensesTable({ expenses, clientOpts, projOpts, showClient = true }: { expenses: (Expense & Named)[]; clientOpts: Opt[]; projOpts: Opt[]; showClient?: boolean }) {
  if (expenses.length === 0) return <EmptyState title="Geen kosten">Freelancers, materiaal, software en advertenties gaan hier van de omzet af.</EmptyState>
  return (
    <div className="card overflow-hidden">
      <Table>
        <thead>
          <tr>
            <th>Omschrijving</th>
            {showClient && <th className="hidden md:table-cell">Klant</th>}
            <th className="hidden sm:table-cell">Categorie</th>
            <th className="hidden sm:table-cell">Datum</th>
            <th className="text-right">Bedrag</th>
            <th className="w-0">
              <span className="sr-only">Acties</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((e) => (
            <tr key={e.id}>
              <td className="font-semibold">{e.description}</td>
              {showClient && <td className="hidden md:table-cell">{e.clients?.name ?? 'Algemeen'}</td>}
              <td className="hidden sm:table-cell">{EXPENSE_CATEGORIES.find((c) => c.value === e.category)?.label}</td>
              <td className="tabular hidden text-[13px] sm:table-cell">{formatDate(e.expense_date, true)}</td>
              <td className="tabular text-right font-semibold">{formatEuro(e.amount, true)}</td>
              <td>
                <div className="flex justify-end gap-1.5">
                  <FormDialog title="Kost bewerken" trigger="Bewerken" triggerClassName="btn btn-secondary btn-sm" action={updateExpenseAction.bind(null, e.id)}>
                    <ExpenseFields expense={e} clients={clientOpts} projects={projOpts} />
                  </FormDialog>
                  <ConfirmButton action={deleteExpenseAction.bind(null, e.id)} confirm={`Kost "${e.description}" verwijderen?`} className="btn btn-ghost btn-sm text-rood">
                    Verwijderen
                  </ConfirmButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  )
}
