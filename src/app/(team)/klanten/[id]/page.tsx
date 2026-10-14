import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink, FolderOpen, Mail, MapPin, Pencil, Phone, Plus } from 'lucide-react'
import { deleteClientAction, updateClientAction } from '@/actions/clients'
import { createContentAction } from '@/actions/content'
import { createContractAction } from '@/actions/contracts'
import { createProjectAction } from '@/actions/projects'
import { getTeam } from '@/lib/auth'
import { CLIENT_STATUSES, optionFor } from '@/lib/constants'
import { formatEuro } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import type { Client, ContentItem, Contract, Expense, Profile, Project, Quote } from '@/lib/types'
import { Badge, Card, PageHeader, Tabs } from '@/components/ui'
import { ConfirmButton, FormDialog } from '@/components/ui/form'
import { ClientFields, ContentFields, ContractFields, ProjectFields, clientOptions, projectOptions, teamOptions } from '@/components/forms'
import { ContentBoard, ContentList, ViewToggle, type ContentRow } from '@/components/content-views'
import { ContractsTable } from './contracts-table'
import { ClientFinance } from './client-finance'
import { PortalAccess } from './portal-access'
import { ProjectsTable } from '../../projecten/projects-table'

type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; weergave?: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('clients').select('name').eq('id', id).single()
  return { title: data?.name ?? 'Klant' }
}

export default async function ClientPage({ params, searchParams }: Params) {
  const { id } = await params
  const { tab = 'overzicht', weergave = 'bord' } = await searchParams
  const supabase = await createClient()

  const [{ data: client }, team, content, projects, contracts, quotes, expenses, logins, allClients] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).single<Client>(),
    getTeam(),
    supabase.from('content_items').select('*, content_comments(count)').eq('client_id', id).order('created_at', { ascending: false }),
    supabase.from('projects').select('*, clients(name), tasks(status)').eq('client_id', id).order('created_at', { ascending: false }),
    supabase.from('contracts').select('*').eq('client_id', id).order('start_date', { ascending: false }),
    supabase.from('quotes').select('*').eq('client_id', id).order('issue_date', { ascending: false }),
    supabase.from('expenses').select('*').eq('client_id', id).order('expense_date', { ascending: false }),
    supabase.from('profiles').select('id, email, full_name, role, client_id, created_at').eq('client_id', id).eq('role', 'client'),
    supabase.from('clients').select('id, name').order('name'),
  ])
  if (!client) notFound()

  const items = (content.data ?? []) as ContentRow[]
  const projectRows = (projects.data ?? []) as (Project & { clients: { name: string } | null; tasks: { status: string }[] })[]
  const contractRows = (contracts.data ?? []) as Contract[]
  const s = optionFor(CLIENT_STATUSES, client.status)
  const base = `/klanten/${id}`
  const clientOpts = clientOptions(allClients.data ?? [])
  const teamOpts = teamOptions(team)
  const projOpts = projectOptions(projectRows)

  const tabs = [
    { href: `${base}`, label: 'Overzicht', key: 'overzicht' },
    { href: `${base}?tab=content`, label: 'Content', key: 'content', count: items.filter((i) => i.status !== 'gepost').length },
    { href: `${base}?tab=projecten`, label: 'Projecten', key: 'projecten', count: projectRows.length },
    { href: `${base}?tab=contracten`, label: 'Contracten', key: 'contracten', count: contractRows.length },
    { href: `${base}?tab=financien`, label: 'Financiën', key: 'financien' },
    { href: `${base}?tab=portaal`, label: 'Portaal', key: 'portaal', count: (logins.data ?? []).length },
  ]
  const activeHref = tabs.find((t) => t.key === tab)?.href ?? base

  return (
    <div className="animate-reveal">
      <PageHeader
        eyebrow={
          <Link href="/klanten" className="hover:text-nacht">
            ← Klanten
          </Link>
        }
        title={
          <span className="flex flex-wrap items-center gap-3">
            {client.name} <Badge tone={s.tone}>{s.label}</Badge>
          </span>
        }
        description={[client.contact_name, client.city].filter(Boolean).join(' · ') || undefined}
        actions={
          <>
            {client.drive_url && (
              <a href={client.drive_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                <FolderOpen size={17} aria-hidden /> Drive-map
              </a>
            )}
            <FormDialog
              title={`${client.name} bewerken`}
              trigger={
                <>
                  <Pencil size={16} aria-hidden /> Bewerken
                </>
              }
              triggerClassName="btn btn-secondary"
              action={updateClientAction.bind(null, id)}
              wide
            >
              <ClientFields client={client} />
            </FormDialog>
          </>
        }
      />

      <Tabs tabs={tabs} active={activeHref} />

      {tab === 'overzicht' && (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="grid content-start gap-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ['Idee → montage', items.filter((i) => ['idee', 'script', 'opname', 'montage'].includes(i.status)).length],
                ['Wacht op feedback', items.filter((i) => i.status === 'feedback').length],
                ['Goedgekeurd / ingepland', items.filter((i) => ['goedgekeurd', 'ingepland'].includes(i.status)).length],
                ['Gepost', items.filter((i) => i.status === 'gepost').length],
              ].map(([label, value]) => (
                <div key={label as string} className="card p-4">
                  <div className="text-[12px] font-semibold text-inkt-zacht">{label}</div>
                  <div className="tabular mt-1 font-display text-[26px] font-bold">{value}</div>
                </div>
              ))}
            </div>
            <Card
              title="Recente content"
              actions={
                <Link href={`${base}?tab=content`} className="link text-[13px]">
                  Alles
                </Link>
              }
              padded={false}
            >
              <div className="p-0">
                <ContentList items={items.slice(0, 6)} team={team} showClient={false} />
              </div>
            </Card>
            {client.notes && (
              <Card title="Notities">
                <p className="whitespace-pre-line">{client.notes}</p>
              </Card>
            )}
          </div>
          <div className="grid content-start gap-6">
            <ContactCard client={client} />
            <ActiveContractCard contracts={contractRows} base={base} />
          </div>
        </div>
      )}

      {tab === 'content' && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <ViewToggle base={base} view={weergave} params={{ tab: 'content' }} />
            <FormDialog
              title="Nieuwe content"
              description={client.name}
              trigger={
                <>
                  <Plus size={17} aria-hidden /> Nieuwe content
                </>
              }
              action={createContentAction}
              wide
            >
              <ContentFields clients={clientOpts} projects={projOpts} team={teamOpts} clientId={id} />
            </FormDialog>
          </div>
          {weergave === 'lijst' ? (
            <ContentList items={items} team={team} showClient={false} />
          ) : (
            <ContentBoard items={items} team={team} showClient={false} />
          )}
        </>
      )}

      {tab === 'projecten' && (
        <>
          <div className="mb-4 flex justify-end">
            <FormDialog
              title="Nieuw project"
              trigger={
                <>
                  <Plus size={17} aria-hidden /> Nieuw project
                </>
              }
              action={createProjectAction}
              wide
            >
              <ProjectFields clients={clientOpts} team={teamOpts} clientId={id} />
            </FormDialog>
          </div>
          <ProjectsTable projects={projectRows} team={team} showClient={false} />
        </>
      )}

      {tab === 'contracten' && (
        <>
          <div className="mb-4 flex justify-end">
            <FormDialog
              title="Nieuw contract"
              description={client.name}
              trigger={
                <>
                  <Plus size={17} aria-hidden /> Nieuw contract
                </>
              }
              action={createContractAction}
            >
              <ContractFields clientId={id} />
            </FormDialog>
          </div>
          <ContractsTable contracts={contractRows} />
        </>
      )}

      {tab === 'financien' && (
        <ClientFinance
          contracts={contractRows}
          quotes={(quotes.data ?? []) as Quote[]}
          expenses={(expenses.data ?? []) as Expense[]}
          clientOpts={clientOpts}
          projOpts={projOpts}
          clientId={id}
        />
      )}

      {tab === 'portaal' && <PortalAccess clientId={id} clientName={client.name} logins={(logins.data ?? []) as (Profile & { created_at: string })[]} />}

      {tab === 'overzicht' && (
        <div className="mt-10 flex justify-end border-t border-lijn pt-6">
          <ConfirmButton
            action={deleteClientAction.bind(null, id)}
            confirm={`${client.name} definitief verwijderen? Content, contracten en portaal-logins van deze klant worden ook verwijderd.`}
          >
            Klant verwijderen
          </ConfirmButton>
        </div>
      )}
    </div>
  )
}

function ContactCard({ client }: { client: Client }) {
  const socials = [
    ['Instagram', client.instagram, (v: string) => `https://instagram.com/${v.replace(/^@/, '')}`],
    ['TikTok', client.tiktok, (v: string) => `https://tiktok.com/@${v.replace(/^@/, '')}`],
    ['Facebook', client.facebook, (v: string) => (v.startsWith('http') ? v : `https://facebook.com/${v}`)],
    ['LinkedIn', client.linkedin, (v: string) => (v.startsWith('http') ? v : `https://linkedin.com/company/${v}`)],
  ] as const
  return (
    <Card title="Contact">
      <ul className="grid gap-2.5 text-[14px]">
        {client.email && (
          <li className="flex items-center gap-2.5">
            <Mail size={16} className="text-hemel" aria-hidden />
            <a className="link" href={`mailto:${client.email}`}>
              {client.email}
            </a>
          </li>
        )}
        {client.phone && (
          <li className="flex items-center gap-2.5">
            <Phone size={16} className="text-hemel" aria-hidden />
            <a className="link" href={`tel:${client.phone.replace(/\s/g, '')}`}>
              {client.phone}
            </a>
          </li>
        )}
        {(client.address || client.city) && (
          <li className="flex items-center gap-2.5">
            <MapPin size={16} className="text-hemel" aria-hidden />
            {[client.address, client.city].filter(Boolean).join(', ')}
          </li>
        )}
        {client.website && (
          <li className="flex items-center gap-2.5">
            <ExternalLink size={16} className="text-hemel" aria-hidden />
            <a className="link" href={client.website} target="_blank" rel="noopener noreferrer">
              {client.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
            </a>
          </li>
        )}
        {client.vat_number && <li className="text-inkt-zacht">Btw {client.vat_number}</li>}
      </ul>
      {socials.some(([, v]) => v) && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-lijn pt-4">
          {socials.map(([label, value, href]) =>
            value ? (
              <a key={label} href={href(value)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                {label}
              </a>
            ) : null,
          )}
        </div>
      )}
    </Card>
  )
}

function ActiveContractCard({ contracts, base }: { contracts: Contract[]; base: string }) {
  const current = contracts.filter((c) => c.status === 'actief').sort((a, b) => b.end_date.localeCompare(a.end_date))[0]
  return (
    <Card
      title="Contract"
      actions={
        <Link href={`${base}?tab=contracten`} className="link text-[13px]">
          Beheren
        </Link>
      }
    >
      {current ? (
        <div>
          <div className="font-display text-[22px] font-bold">{current.package}</div>
          <div className="tabular text-inkt-zacht">{formatEuro(current.monthly_amount)} per maand</div>
          <ContractsTable contracts={[current]} compact />
        </div>
      ) : (
        <p className="text-inkt-zacht">Geen actief contract.</p>
      )}
    </Card>
  )
}
