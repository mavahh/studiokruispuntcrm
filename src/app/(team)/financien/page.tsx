import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createExpenseAction, createQuoteAction } from '@/actions/finance'
import { financeEntries, monthlyRecurring, quarterOf, quartersForYear, quoteRevenueDate, totalsForYear, yearsInData, retainerBillingDates } from '@/lib/finance'
import { formatEuro, todayISO } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import type { Contract, Expense, Quote } from '@/lib/types'
import { Card, PageHeader, Stat, Table, Tabs } from '@/components/ui'
import { FormDialog } from '@/components/ui/form'
import { ExpenseFields, QuoteFields, clientOptions, projectOptions } from '@/components/forms'
import { ExpensesTable, QuotesTable } from '@/components/finance-tables'
import { RevenueChart } from '@/components/revenue-chart'

export const metadata: Metadata = { title: 'Omzet & winst' }

type Named = { clients: { name: string } | null }

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ jaar?: string; tab?: string }> }) {
  const sp = await searchParams
  const today = todayISO()
  const currentYear = Number(today.slice(0, 4))
  const year = Number(sp.jaar) || currentYear
  const tab = sp.tab ?? 'overzicht'
  const supabase = await createClient()

  const [{ data: contracts }, { data: quotes }, { data: expenses }, { data: clients }, { data: projects }] = await Promise.all([
    supabase.from('contracts').select('*, clients(name)'),
    supabase.from('quotes').select('*, clients(name)').order('issue_date', { ascending: false }),
    supabase.from('expenses').select('*, clients(name)').order('expense_date', { ascending: false }),
    supabase.from('clients').select('id, name').order('name'),
    supabase.from('projects').select('id, title').order('title'),
  ])
  const c = (contracts ?? []) as (Contract & Named)[]
  const q = (quotes ?? []) as (Quote & Named)[]
  const e = (expenses ?? []) as (Expense & Named)[]
  const entries = financeEntries(c, q, e)
  const quarters = quartersForYear(entries, year)
  const total = totalsForYear(entries, year)
  const prev = totalsForYear(entries, year - 1)
  const years = yearsInData(entries, currentYear)
  const clientOpts = clientOptions(clients ?? [])
  const projOpts = projectOptions(projects ?? [])
  const margin = total.revenue > 0 ? Math.round((total.profit / total.revenue) * 100) : null
  const growth = prev.revenue > 0 ? Math.round(((total.revenue - prev.revenue) / prev.revenue) * 100) : null
  const currentQKey = quarterOf(today).key

  // Omzet en winst per klant in het gekozen jaar
  const perClient = new Map<string, { name: string; revenue: number; expenses: number }>()
  const bucket = (id: string | null, name: string | undefined) => {
    const key = id ?? '_'
    if (!perClient.has(key)) perClient.set(key, { name: name ?? 'Algemeen', revenue: 0, expenses: 0 })
    return perClient.get(key)!
  }
  for (const k of c) {
    const n = retainerBillingDates(k).filter((d) => Number(d.slice(0, 4)) === year).length
    if (n) bucket(k.client_id, k.clients?.name).revenue += n * Number(k.monthly_amount)
  }
  for (const x of q) if (x.status === 'bevestigd' && Number(quoteRevenueDate(x).slice(0, 4)) === year) bucket(x.client_id, x.clients?.name).revenue += Number(x.amount)
  for (const x of e) if (Number(x.expense_date.slice(0, 4)) === year) bucket(x.client_id, x.clients?.name).expenses += Number(x.amount)
  const clientRows = [...perClient.values()].sort((a, b) => b.revenue - b.expenses - (a.revenue - a.expenses))

  const base = `/financien?jaar=${year}`
  const quotesInYear = q.filter((x) => Number(x.issue_date.slice(0, 4)) === year || (x.accepted_date && Number(x.accepted_date.slice(0, 4)) === year))
  const expensesInYear = e.filter((x) => Number(x.expense_date.slice(0, 4)) === year)

  return (
    <div className="animate-reveal">
      <PageHeader
        title="Omzet & winst"
        description="Bevestigde offertes en maandelijkse retainers, min kosten. Alle bedragen excl. btw."
        actions={
          <>
            <FormDialog
              title="Nieuwe offerte"
              trigger={
                <>
                  <Plus size={16} aria-hidden /> Offerte
                </>
              }
              triggerClassName="btn btn-secondary"
              action={createQuoteAction}
              wide
            >
              <QuoteFields clients={clientOpts} projects={projOpts} />
            </FormDialog>
            <FormDialog
              title="Nieuwe kost"
              trigger={
                <>
                  <Plus size={16} aria-hidden /> Kost
                </>
              }
              action={createExpenseAction}
            >
              <ExpenseFields clients={clientOpts} projects={projOpts} />
            </FormDialog>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Jaar">
        {years.map((y) => (
          <Link key={y} href={`/financien?jaar=${y}${tab !== 'overzicht' ? `&tab=${tab}` : ''}`} className={`btn btn-sm ${y === year ? 'bg-nacht text-white' : 'btn-secondary'}`}>
            {y}
          </Link>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <Stat label={`Omzet ${year}`} value={formatEuro(total.revenue)} hint={growth != null ? `${growth >= 0 ? '+' : ''}${growth}% t.o.v. ${year - 1}` : undefined} />
        <Stat label={`Kosten ${year}`} value={formatEuro(total.expenses)} />
        <Stat tone="dark" label={`Winst ${year}`} value={formatEuro(total.profit)} hint={margin != null ? `${margin}% marge` : undefined} />
        <Stat label="Retainers per maand" value={formatEuro(monthlyRecurring(c, today))} hint="nu lopend" />
      </div>

      <Tabs
        active={tab === 'overzicht' ? base : `${base}&tab=${tab}`}
        tabs={[
          { href: base, label: 'Per kwartaal' },
          { href: `${base}&tab=offertes`, label: 'Offertes', count: quotesInYear.length },
          { href: `${base}&tab=kosten`, label: 'Kosten', count: expensesInYear.length },
        ]}
      />

      {tab === 'overzicht' && (
        <div className="grid gap-6">
          <Card>
            <RevenueChart title={`Omzet per kwartaal, ${year}`} bars={quarters} />
          </Card>

          <Card title="Kwartalen" padded={false}>
            <Table>
              <thead>
                <tr>
                  <th>Kwartaal</th>
                  <th className="hidden text-right sm:table-cell">Retainers</th>
                  <th className="hidden text-right sm:table-cell">Offertes</th>
                  <th className="text-right">Omzet</th>
                  <th className="hidden text-right sm:table-cell">Kosten</th>
                  <th className="text-right">Winst</th>
                </tr>
              </thead>
              <tbody className="tabular">
                {quarters.map((p) => (
                  <tr key={p.key} className={p.key === currentQKey ? 'bg-mint-soft/40' : ''}>
                    <td className="font-semibold">
                      {p.label} {p.key === currentQKey && <span className="text-[12px] font-normal text-groen">· nu</span>}
                    </td>
                    <td className="hidden text-right sm:table-cell">{formatEuro(p.retainers)}</td>
                    <td className="hidden text-right sm:table-cell">{formatEuro(p.quotes)}</td>
                    <td className="text-right font-semibold">{formatEuro(p.revenue)}</td>
                    <td className="hidden text-right sm:table-cell">{formatEuro(p.expenses)}</td>
                    <td className={`text-right font-semibold ${p.profit < 0 ? 'text-rood' : ''}`}>{formatEuro(p.profit)}</td>
                  </tr>
                ))}
                <tr className="bg-papier font-bold">
                  <td>Totaal {year}</td>
                  <td className="hidden text-right sm:table-cell">{formatEuro(total.retainers)}</td>
                  <td className="hidden text-right sm:table-cell">{formatEuro(total.quotes)}</td>
                  <td className="text-right">{formatEuro(total.revenue)}</td>
                  <td className="hidden text-right sm:table-cell">{formatEuro(total.expenses)}</td>
                  <td className={`text-right ${total.profit < 0 ? 'text-rood' : ''}`}>{formatEuro(total.profit)}</td>
                </tr>
              </tbody>
            </Table>
          </Card>

          <Card title={`Per klant, ${year}`} padded={false}>
            {clientRows.length === 0 ? (
              <p className="p-5 text-inkt-zacht">Nog geen omzet of kosten in {year}.</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th>Klant</th>
                    <th className="text-right">Omzet</th>
                    <th className="hidden text-right sm:table-cell">Kosten</th>
                    <th className="text-right">Winst</th>
                  </tr>
                </thead>
                <tbody className="tabular">
                  {clientRows.map((r) => (
                    <tr key={r.name}>
                      <td className="font-semibold">{r.name}</td>
                      <td className="text-right">{formatEuro(r.revenue)}</td>
                      <td className="hidden text-right sm:table-cell">{formatEuro(r.expenses)}</td>
                      <td className={`text-right font-semibold ${r.revenue - r.expenses < 0 ? 'text-rood' : ''}`}>{formatEuro(r.revenue - r.expenses)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
          <p className="text-[13px] text-inkt-zacht">
            Retainers tellen per maand op de startdag van het contract. Offertes tellen op de datum van bevestiging. Toekomstige maanden van lopende
            contracten zitten al in de kwartalen, zodat je ziet wat er vastligt.
          </p>
        </div>
      )}

      {tab === 'offertes' && <QuotesTable quotes={quotesInYear} clientOpts={clientOpts} projOpts={projOpts} />}
      {tab === 'kosten' && <ExpensesTable expenses={expensesInYear} clientOpts={clientOpts} projOpts={projOpts} />}
    </div>
  )
}
