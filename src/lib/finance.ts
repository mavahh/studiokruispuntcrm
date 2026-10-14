import type { Contract, Expense, Quote } from './types'

export type Period = { key: string; label: string; revenue: number; retainers: number; quotes: number; expenses: number; profit: number }

/**
 * Factuurmomenten van een retainer: elke maand op de startdag, zolang die
 * datum niet na de einddatum valt. 1 jan → 31 dec geeft dus 12 maanden.
 */
export function retainerBillingDates(contract: Pick<Contract, 'start_date' | 'end_date'>): string[] {
  const [sy, sm, sd] = contract.start_date.split('-').map(Number) as [number, number, number]
  const dates: string[] = []
  for (let k = 0; k < 600; k++) {
    const y = sy + Math.floor((sm - 1 + k) / 12)
    const m = ((sm - 1 + k) % 12) + 1
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(Math.min(sd, lastDay)).padStart(2, '0')}`
    if (iso > contract.end_date) break
    dates.push(iso)
  }
  return dates
}

export function quarterOf(iso: string) {
  const y = iso.slice(0, 4)
  const q = Math.floor((Number(iso.slice(5, 7)) - 1) / 3) + 1
  return { key: `${y}-Q${q}`, label: `Q${q} ${y}` }
}

export function quoteRevenueDate(q: Quote) {
  return q.accepted_date ?? q.issue_date
}

type Entry = { date: string; amount: number; kind: 'retainers' | 'quotes' | 'expenses' }

export function financeEntries(contracts: Contract[], quotes: Quote[], expenses: Expense[]): Entry[] {
  const entries: Entry[] = []
  for (const c of contracts) {
    for (const date of retainerBillingDates(c)) entries.push({ date, amount: Number(c.monthly_amount), kind: 'retainers' })
  }
  for (const q of quotes) {
    if (q.status === 'bevestigd') entries.push({ date: quoteRevenueDate(q), amount: Number(q.amount), kind: 'quotes' })
  }
  for (const e of expenses) entries.push({ date: e.expense_date, amount: Number(e.amount), kind: 'expenses' })
  return entries
}

function emptyPeriod(key: string, label: string): Period {
  return { key, label, revenue: 0, retainers: 0, quotes: 0, expenses: 0, profit: 0 }
}

function add(p: Period, e: Entry) {
  p[e.kind] += e.amount
  p.revenue = p.retainers + p.quotes
  p.profit = p.revenue - p.expenses
}

/** De vier kwartalen van een jaar, altijd allemaal aanwezig (ook als ze leeg zijn). */
export function quartersForYear(entries: Entry[], year: number): Period[] {
  const periods = [1, 2, 3, 4].map((q) => emptyPeriod(`${year}-Q${q}`, `Q${q}`))
  for (const e of entries) {
    if (Number(e.date.slice(0, 4)) !== year) continue
    add(periods[Math.floor((Number(e.date.slice(5, 7)) - 1) / 3)]!, e)
  }
  return periods
}

export function totalsForYear(entries: Entry[], year: number): Period {
  const p = emptyPeriod(String(year), String(year))
  for (const e of entries) if (Number(e.date.slice(0, 4)) === year) add(p, e)
  return p
}

export function yearsInData(entries: Entry[], current: number): number[] {
  const years = new Set<number>([current])
  for (const e of entries) years.add(Number(e.date.slice(0, 4)))
  return [...years].filter((y) => y <= current + 1).sort((a, b) => b - a)
}

/** Maandelijks terugkerende omzet: contracten die vandaag lopen. */
export function monthlyRecurring(contracts: Contract[], today: string) {
  return contracts
    .filter((c) => c.status !== 'gestopt' && c.start_date <= today && c.end_date >= today)
    .reduce((sum, c) => sum + Number(c.monthly_amount), 0)
}

export function contractTotal(c: Contract) {
  return retainerBillingDates(c).length * Number(c.monthly_amount)
}
