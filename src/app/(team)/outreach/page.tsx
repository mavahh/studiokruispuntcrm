import type { Metadata } from 'next'
import Link from 'next/link'
import { FileText, Mail, Phone, Plus, Upload } from 'lucide-react'
import { createLeadAction, setLeadStatusAction } from '@/actions/outreach'
import { getTeam } from '@/lib/auth'
import { LEAD_STATUSES, SECTORS, optionFor } from '@/lib/constants'
import { formatDate, relativeDays, todayISO } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import type { Lead } from '@/lib/types'
import { Avatar, Badge, EmptyState, PageHeader, Stat, Table } from '@/components/ui'
import { FormDialog } from '@/components/ui/form'
import { Kanban } from '@/components/kanban'
import { ViewToggle } from '@/components/content-views'
import { LeadFields, teamOptions } from '@/components/forms'

export const metadata: Metadata = { title: 'Outreach' }

const OPEN = ['nieuw', 'gecontacteerd', 'opvolgen', 'gesprek', 'offerte']

export default async function OutreachPage({
  searchParams,
}: {
  searchParams: Promise<{ weergave?: string; q?: string; sector?: string; wie?: string; status?: string }>
}) {
  const { weergave = 'bord', q = '', sector = '', wie = '', status = '' } = await searchParams
  const supabase = await createClient()
  const today = todayISO()

  let query = supabase.from('leads').select('*').order('next_follow_up', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false })
  if (sector) query = query.eq('sector', sector)
  if (wie) query = query.eq('owner_id', wie)
  if (status) query = query.eq('status', status)
  if (q) {
    const term = q.replace(/[%,()]/g, ' ').trim()
    query = query.or(`business_name.ilike.%${term}%,contact_name.ilike.%${term}%,city.ilike.%${term}%,email.ilike.%${term}%`)
  }
  const [{ data }, team, { count: wonTotal }] = await Promise.all([
    query,
    getTeam(),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'gewonnen'),
  ])
  const leads = (data ?? []) as Lead[]
  const due = leads.filter((l) => OPEN.includes(l.status) && l.next_follow_up && l.next_follow_up <= today && !l.do_not_contact)
  const teamOpts = teamOptions(team)
  const base = '/outreach'

  return (
    <div className="animate-reveal">
      <PageHeader
        title="Outreach"
        description="Nieuwe klanten zoeken: leads, mails, telefoontjes en opvolging."
        actions={
          <>
            <Link href="/outreach/sjablonen" className="btn btn-secondary">
              <FileText size={16} aria-hidden /> Sjablonen
            </Link>
            <Link href="/outreach/importeren" className="btn btn-secondary">
              <Upload size={16} aria-hidden /> Importeren
            </Link>
            <FormDialog
              title="Nieuwe lead"
              trigger={
                <>
                  <Plus size={17} aria-hidden /> Nieuwe lead
                </>
              }
              action={createLeadAction}
              submitLabel="Lead toevoegen"
              wide
            >
              <LeadFields team={teamOpts} />
            </FormDialog>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <Stat tone="dark" label="Vandaag opvolgen" value={due.length} hint={due.length ? 'zie lijst hieronder' : 'alles bij'} />
        <Stat label="Nieuw" value={leads.filter((l) => l.status === 'nieuw').length} hint="nog niet gecontacteerd" />
        <Stat label="In gesprek / offerte" value={leads.filter((l) => ['gesprek', 'offerte'].includes(l.status)).length} />
        <Stat label="Gewonnen" value={wonTotal ?? 0} hint="leads die klant werden" />
      </div>

      {due.length > 0 && (
        <section className="mb-8 rounded-kaart border border-signaal/40 bg-signaal-soft p-5">
          <h2 className="mb-3 text-[17px] font-semibold">Vandaag opvolgen</h2>
          <ul className="grid gap-2">
            {due.map((l) => {
              const s = optionFor(LEAD_STATUSES, l.status)
              return (
                <li key={l.id}>
                  <Link href={`/outreach/${l.id}`} className="flex flex-wrap items-center gap-3 rounded-veld bg-white px-4 py-3 hover:bg-papier">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{l.business_name}</div>
                      <div className="text-[13px] text-inkt-zacht">{[l.contact_name, l.city, l.sector].filter(Boolean).join(' · ')}</div>
                    </div>
                    <Badge tone={s.tone}>{s.label}</Badge>
                    <span className={`text-[13px] font-semibold ${l.next_follow_up! < today ? 'text-rood' : 'text-[#9a4300]'}`}>{relativeDays(l.next_follow_up)}</span>
                    <span className="flex gap-1 text-inkt-zacht">
                      {l.email && <Mail size={15} aria-label="heeft e-mail" />}
                      {l.phone && <Phone size={15} aria-label="heeft telefoon" />}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <ViewToggle base={base} view={weergave} params={{ q, sector, wie, status }} />
        <form className="flex flex-wrap gap-2" role="search">
          <input type="hidden" name="weergave" value={weergave} />
          <input className="field h-9 w-full py-0 text-[14px] sm:w-56" name="q" defaultValue={q} placeholder="Zoek zaak, persoon, gemeente…" aria-label="Zoeken" />
          <select name="sector" defaultValue={sector} className="field h-9 w-auto py-0 text-[14px]" aria-label="Sector">
            <option value="">Alle sectoren</option>
            {SECTORS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select name="wie" defaultValue={wie} className="field h-9 w-auto py-0 text-[14px]" aria-label="Verantwoordelijke">
            <option value="">Iedereen</option>
            {team.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name || t.email}
              </option>
            ))}
          </select>
          {weergave === 'lijst' && (
            <select name="status" defaultValue={status} className="field h-9 w-auto py-0 text-[14px]" aria-label="Status">
              <option value="">Alle statussen</option>
              {LEAD_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          )}
          <button className="btn btn-secondary btn-sm h-9">Filter</button>
        </form>
      </div>

      {leads.length === 0 ? (
        <EmptyState title={q || sector || wie || status ? 'Geen leads gevonden' : 'Nog geen leads'}>
          Voeg een lead toe of importeer een lijst uit Excel of Google Sheets.
        </EmptyState>
      ) : weergave === 'lijst' ? (
        <div className="card overflow-hidden">
          <Table>
            <thead>
              <tr>
                <th>Zaak</th>
                <th>Status</th>
                <th className="hidden md:table-cell">Sector</th>
                <th className="hidden sm:table-cell">Opvolgen</th>
                <th className="hidden lg:table-cell">Laatste contact</th>
                <th className="hidden md:table-cell">Wie</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => {
                const s = optionFor(LEAD_STATUSES, l.status)
                const owner = team.find((t) => t.id === l.owner_id)
                const late = l.next_follow_up && l.next_follow_up <= today && OPEN.includes(l.status)
                return (
                  <tr key={l.id} className="hover:bg-papier">
                    <td>
                      <Link href={`/outreach/${l.id}`} className="font-semibold hover:underline">
                        {l.business_name}
                      </Link>
                      <div className="text-[13px] text-inkt-zacht">{[l.contact_name, l.city].filter(Boolean).join(' · ')}</div>
                    </td>
                    <td>
                      <Badge tone={s.tone}>{s.label}</Badge>
                      {l.do_not_contact && <div className="mt-1 text-[12px] text-rood">niet contacteren</div>}
                    </td>
                    <td className="hidden md:table-cell">{l.sector ?? '—'}</td>
                    <td className={`tabular hidden sm:table-cell ${late ? 'font-semibold text-rood' : ''}`}>{formatDate(l.next_follow_up, true)}</td>
                    <td className="tabular hidden text-[13px] text-inkt-zacht lg:table-cell">{l.last_contacted_at ? formatDate(l.last_contacted_at) : 'nog niet'}</td>
                    <td className="hidden md:table-cell">{owner ? <Avatar name={owner.full_name || owner.email} size={24} /> : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        </div>
      ) : (
        <Kanban
          columns={LEAD_STATUSES}
          onMove={setLeadStatusAction}
          items={leads.map((l) => {
            const owner = team.find((t) => t.id === l.owner_id)
            const late = l.next_follow_up && l.next_follow_up <= today && OPEN.includes(l.status)
            return {
              id: l.id,
              status: l.status,
              node: (
                <div>
                  <Link href={`/outreach/${l.id}`} className="block leading-snug font-semibold hover:underline" draggable={false}>
                    {l.business_name}
                  </Link>
                  <div className="mt-0.5 truncate text-[12px] text-inkt-zacht">{[l.city, l.sector].filter(Boolean).join(' · ') || 'Geen details'}</div>
                  <div className="mt-2 flex items-center gap-2 text-[12px] text-inkt-zacht">
                    {l.next_follow_up && OPEN.includes(l.status) && (
                      <span className={late ? 'font-semibold text-rood' : ''}>opvolgen {formatDate(l.next_follow_up, true)}</span>
                    )}
                    {l.email && <Mail size={13} aria-label="heeft e-mail" />}
                    {l.phone && <Phone size={13} aria-label="heeft telefoon" />}
                    {owner && (
                      <span className="ml-auto">
                        <Avatar name={owner.full_name || owner.email} size={22} />
                      </span>
                    )}
                  </div>
                </div>
              ),
            }
          })}
        />
      )}
    </div>
  )
}
