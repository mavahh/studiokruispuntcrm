import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import { createClientAction } from '@/actions/clients'
import { CLIENT_STATUSES, CONTRACT_WARNING_DAYS, optionFor } from '@/lib/constants'
import { addDaysISO, formatDate, formatEuro, todayISO } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import type { Client, ContentItem, Contract } from '@/lib/types'
import { Badge, EmptyState, PageHeader, Table } from '@/components/ui'
import { FormDialog } from '@/components/ui/form'
import { ClientFields } from '@/components/forms'

export const metadata: Metadata = { title: 'Klanten' }

type Row = Client & { contracts: Contract[]; content_items: Pick<ContentItem, 'status'>[] }

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q = '', status = '' } = await searchParams
  const supabase = await createClient()
  let query = supabase.from('clients').select('*, contracts(*), content_items(status)').order('name')
  if (status) query = query.eq('status', status)
  if (q) {
    const term = q.replace(/[%,()]/g, ' ').trim()
    query = query.or(`name.ilike.%${term}%,contact_name.ilike.%${term}%,city.ilike.%${term}%,email.ilike.%${term}%`)
  }
  const { data } = await query
  const clients = (data ?? []) as Row[]
  const today = todayISO()
  const warnBy = addDaysISO(today, CONTRACT_WARNING_DAYS)

  return (
    <div className="animate-reveal">
      <PageHeader
        title="Klanten"
        description={`${clients.length} ${clients.length === 1 ? 'klant' : 'klanten'}`}
        actions={
          <FormDialog
            title="Nieuwe klant"
            trigger={
              <>
                <Plus size={17} aria-hidden /> Nieuwe klant
              </>
            }
            action={createClientAction}
            submitLabel="Klant aanmaken"
            wide
          >
            <ClientFields />
          </FormDialog>
        }
      />

      <form className="mb-4 flex flex-col gap-2 sm:flex-row" role="search">
        <label className="relative flex-1">
          <span className="sr-only">Zoeken</span>
          <Search size={17} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-inkt-zacht" aria-hidden />
          <input className="field pl-9" name="q" defaultValue={q} placeholder="Zoek op naam, contactpersoon, gemeente…" />
        </label>
        <select className="field sm:w-48" name="status" defaultValue={status} aria-label="Status">
          <option value="">Alle statussen</option>
          {CLIENT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button className="btn btn-secondary">Filter</button>
      </form>

      {clients.length === 0 ? (
        <EmptyState title={q || status ? 'Geen klanten gevonden' : 'Nog geen klanten'}>
          {q || status ? 'Probeer een andere zoekterm of filter.' : 'Voeg je eerste klant toe met de knop rechtsboven.'}
        </EmptyState>
      ) : (
        <div className="card overflow-hidden">
          <Table>
            <thead>
              <tr>
                <th>Klant</th>
                <th className="hidden md:table-cell">Contact</th>
                <th>Status</th>
                <th className="hidden lg:table-cell">Contract</th>
                <th className="hidden sm:table-cell">Content</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const s = optionFor(CLIENT_STATUSES, c.status)
                const current = c.contracts
                  .filter((k) => k.status === 'actief')
                  .sort((a, b) => b.end_date.localeCompare(a.end_date))[0]
                const expiring = current && current.end_date <= warnBy
                const waiting = c.content_items.filter((i) => i.status === 'feedback').length
                const open = c.content_items.filter((i) => i.status !== 'gepost').length
                return (
                  <tr key={c.id} className="hover:bg-papier">
                    <td>
                      <Link href={`/klanten/${c.id}`} className="font-semibold text-nacht hover:underline">
                        {c.name}
                      </Link>
                      {c.city && <div className="text-[13px] text-inkt-zacht">{c.city}</div>}
                    </td>
                    <td className="hidden md:table-cell">
                      <div>{c.contact_name ?? '—'}</div>
                      <div className="text-[13px] text-inkt-zacht">{c.email}</div>
                    </td>
                    <td>
                      <Badge tone={s.tone}>{s.label}</Badge>
                    </td>
                    <td className="hidden lg:table-cell">
                      {current ? (
                        <>
                          <div>
                            {current.package} · {formatEuro(current.monthly_amount)}/m
                          </div>
                          <div className={`text-[13px] ${expiring ? 'font-semibold text-[#9a4300]' : 'text-inkt-zacht'}`}>
                            tot {formatDate(current.end_date)}
                          </div>
                        </>
                      ) : (
                        <span className="text-inkt-zacht">Geen actief contract</span>
                      )}
                    </td>
                    <td className="hidden sm:table-cell">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge tone="neutral">{open} open</Badge>
                        {waiting > 0 && <Badge tone="signal">{waiting} wacht op feedback</Badge>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  )
}
