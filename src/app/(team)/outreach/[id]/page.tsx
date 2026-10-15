import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink, Mail, MapPin, MessageSquareText, Pencil, Phone, PhoneCall, StickyNote, Store, UserCheck } from 'lucide-react'
import { convertLeadAction, deleteLeadAction, logContactAction, sendLeadEmailAction, setFollowUpAction, setLeadStatusAction, updateLeadAction } from '@/actions/outreach'
import { aiConfigured } from '@/lib/ai'
import { getTeam, requireTeam } from '@/lib/auth'
import { ACTIVITY_LABELS, FOLLOW_UP_DAYS, LEAD_STATUSES, OUTCOMES, optionFor } from '@/lib/constants'
import { addDaysISO, formatDate, formatDateTime, relativeDays, todayISO } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import type { EmailTemplate, Lead, LeadActivity, TemplateKind } from '@/lib/types'
import { Avatar, Badge, Card, PageHeader } from '@/components/ui'
import { ActionForm, AutoSelect, ConfirmButton, FormDialog, SubmitButton } from '@/components/ui/form'
import { SelectField, TextArea, TextField } from '@/components/ui/fields'
import { LeadFields, teamOptions } from '@/components/forms'
import { EmailComposer } from './email-composer'

type Params = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('leads').select('business_name').eq('id', id).single()
  return { title: data?.business_name ?? 'Lead' }
}

const ACTIVITY_ICONS = { email: Mail, telefoon: PhoneCall, bezoek: Store, notitie: StickyNote, status: MessageSquareText }

export default async function LeadPage({ params }: Params) {
  const { id } = await params
  const profile = await requireTeam()
  const supabase = await createClient()
  const [{ data: lead }, team, { data: activities }, { data: templates }] = await Promise.all([
    supabase.from('leads').select('*').eq('id', id).single<Lead>(),
    getTeam(),
    supabase.from('lead_activities').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    supabase.from('email_templates').select('*').order('created_at'),
  ])
  if (!lead) notFound()

  const today = todayISO()
  const acts = (activities ?? []) as LeadActivity[]
  const emailsSent = acts.filter((a) => a.type === 'email').length
  const hadConversation = acts.some((a) => a.outcome === 'afspraak') || ['gesprek', 'offerte'].includes(lead.status)
  const defaultKind: TemplateKind = hadConversation ? 'na_gesprek' : emailsSent > 0 ? 'opvolging' : 'eerste'
  const owner = team.find((t) => t.id === lead.owner_id)
  const sender = (profile.full_name || profile.email).split(' ')[0]!
  const s = optionFor(LEAD_STATUSES, lead.status)
  const due = lead.next_follow_up && lead.next_follow_up <= today && !['gewonnen', 'verloren'].includes(lead.status)

  return (
    <div className="animate-reveal">
      <PageHeader
        eyebrow={
          <Link href="/outreach" className="hover:text-nacht">
            ← Outreach
          </Link>
        }
        title={
          <span className="flex flex-wrap items-center gap-3">
            {lead.business_name} <Badge tone={s.tone}>{s.label}</Badge>
          </span>
        }
        description={[lead.contact_name, lead.sector, lead.city].filter(Boolean).join(' · ') || undefined}
        actions={
          <>
            <AutoSelect
              label="Status"
              name="status"
              defaultValue={lead.status}
              options={LEAD_STATUSES}
              action={setLeadStatusAction.bind(null, id)}
              className="field h-10 w-auto py-0 font-semibold"
            />
            <FormDialog
              title={`${lead.business_name} bewerken`}
              trigger={
                <>
                  <Pencil size={16} aria-hidden /> Bewerken
                </>
              }
              triggerClassName="btn btn-secondary"
              action={updateLeadAction.bind(null, id)}
              wide
            >
              <LeadFields lead={lead} team={teamOptions(team)} />
            </FormDialog>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="grid min-w-0 content-start gap-6">
          <Card title="E-mail schrijven">
            <EmailComposer
              lead={lead}
              templates={(templates ?? []) as EmailTemplate[]}
              sender={sender}
              defaultFollowUp={addDaysISO(today, FOLLOW_UP_DAYS.email)}
              defaultKind={defaultKind}
              canSend={!!process.env.RESEND_API_KEY && !!process.env.OUTREACH_FROM}
              aiEnabled={aiConfigured()}
              send={sendLeadEmailAction.bind(null, id)}
            />
          </Card>

          <Card title="Tijdlijn" padded={false}>
            {acts.length === 0 ? (
              <p className="p-5 text-inkt-zacht">Nog geen contact. Stuur een mail of log een telefoontje.</p>
            ) : (
              <ol className="divide-y divide-lijn">
                {acts.map((a) => {
                  const Icon = ACTIVITY_ICONS[a.type]
                  const who = team.find((t) => t.id === a.created_by)
                  return (
                    <li key={a.id} className="flex gap-3 px-5 py-4">
                      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${a.type === 'status' ? 'bg-papier text-inkt-zacht' : 'bg-hemel-soft text-blauw'}`}>
                        <Icon size={15} aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-inkt-zacht">
                          <span className="font-semibold text-nacht">{ACTIVITY_LABELS[a.type]}</span>
                          {a.outcome && <Badge tone={optionFor(OUTCOMES, a.outcome).tone}>{optionFor(OUTCOMES, a.outcome).label}</Badge>}
                          <span>
                            {formatDateTime(a.created_at)}
                            {who ? ` · ${who.full_name || who.email}` : ''}
                          </span>
                        </div>
                        {a.subject && <div className="mt-1 font-semibold">{a.subject}</div>}
                        {a.body && (
                          <p className={`mt-1 text-[14px] whitespace-pre-line ${a.type === 'email' ? 'line-clamp-6' : ''} ${a.type === 'status' ? 'text-inkt-zacht' : ''}`}>{a.body}</p>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </Card>
        </div>

        <div className="order-first grid content-start gap-6 lg:order-none">
          <section className={`rounded-kaart p-5 ${due ? 'border border-signaal/50 bg-signaal-soft' : 'card'}`}>
            <h2 className="text-[17px] font-semibold">Opvolging</h2>
            <p className={`mt-1 text-[14px] ${due ? 'font-semibold text-[#9a4300]' : 'text-inkt-zacht'}`}>
              {lead.next_follow_up ? `${formatDate(lead.next_follow_up)} (${relativeDays(lead.next_follow_up)})` : 'Geen opvolging gepland'}
            </p>
            <ActionForm action={setFollowUpAction.bind(null, id)} className="mt-3 flex gap-2">
              <label className="flex-1">
                <span className="sr-only">Nieuwe opvolgdatum</span>
                <input className="field" type="date" name="next_follow_up" defaultValue={lead.next_follow_up ?? ''} />
              </label>
              <SubmitButton className="btn btn-secondary">Opslaan</SubmitButton>
            </ActionForm>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <FormDialog
                title="Telefoon of bezoek loggen"
                trigger={
                  <>
                    <PhoneCall size={15} aria-hidden /> Gesprek
                  </>
                }
                triggerClassName="btn btn-secondary btn-sm"
                action={logContactAction.bind(null, id)}
                submitLabel="Loggen"
              >
                <SelectField
                  label="Soort"
                  name="type"
                  options={[
                    { value: 'telefoon', label: 'Telefoon' },
                    { value: 'bezoek', label: 'Langsgegaan' },
                  ]}
                  defaultValue="telefoon"
                />
                <SelectField label="Resultaat" name="outcome" options={OUTCOMES} defaultValue="geen_antwoord" />
                <TextArea label="Notities" name="body" rows={4} placeholder="Wat werd er gezegd? Wanneer terugbellen?" />
                <TextField
                  label="Opvolgen op"
                  name="next_follow_up"
                  type="date"
                  hint="Leeg = automatisch: 3 dagen bij geen antwoord, 2 bij terugbellen, morgen na een afspraak."
                />
              </FormDialog>
              <FormDialog
                title="Notitie"
                trigger={
                  <>
                    <StickyNote size={15} aria-hidden /> Notitie
                  </>
                }
                triggerClassName="btn btn-secondary btn-sm"
                action={logContactAction.bind(null, id)}
                submitLabel="Opslaan"
              >
                <input type="hidden" name="type" value="notitie" />
                <TextArea label="Notitie" name="body" rows={5} required />
              </FormDialog>
            </div>
          </section>

          <Card title="Gegevens">
            <ul className="grid gap-2.5 text-[14px]">
              {lead.contact_name && (
                <li className="flex items-center gap-2.5">
                  <UserCheck size={16} className="text-hemel" aria-hidden />
                  {lead.contact_name}
                </li>
              )}
              {lead.email && (
                <li className="flex items-center gap-2.5">
                  <Mail size={16} className="text-hemel" aria-hidden />
                  <a className="link truncate" href={`mailto:${lead.email}`}>
                    {lead.email}
                  </a>
                </li>
              )}
              {lead.phone && (
                <li className="flex items-center gap-2.5">
                  <Phone size={16} className="text-hemel" aria-hidden />
                  <a className="link" href={`tel:${lead.phone.replace(/\s/g, '')}`}>
                    {lead.phone}
                  </a>
                </li>
              )}
              {lead.city && (
                <li className="flex items-center gap-2.5">
                  <MapPin size={16} className="text-hemel" aria-hidden />
                  {lead.city}
                </li>
              )}
              {lead.website && (
                <li className="flex items-center gap-2.5">
                  <ExternalLink size={16} className="text-hemel" aria-hidden />
                  <a className="link truncate" href={lead.website} target="_blank" rel="noopener noreferrer">
                    {lead.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                  </a>
                </li>
              )}
              {lead.instagram && (
                <li className="flex items-center gap-2.5">
                  <ExternalLink size={16} className="text-hemel" aria-hidden />
                  <a className="link" href={`https://instagram.com/${lead.instagram.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer">
                    {lead.instagram}
                  </a>
                </li>
              )}
            </ul>
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-lijn pt-4 text-[13px]">
              <div>
                <dt className="text-inkt-zacht">Verantwoordelijke</dt>
                <dd className="mt-0.5 flex items-center gap-1.5 font-semibold">
                  {owner ? (
                    <>
                      <Avatar name={owner.full_name || owner.email} size={20} /> {owner.full_name || owner.email}
                    </>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-inkt-zacht">Laatste contact</dt>
                <dd className="mt-0.5 font-semibold">{lead.last_contacted_at ? formatDate(lead.last_contacted_at) : 'nog niet'}</dd>
              </div>
              <div>
                <dt className="text-inkt-zacht">Bron</dt>
                <dd className="mt-0.5 font-semibold capitalize">{lead.source}</dd>
              </div>
              <div>
                <dt className="text-inkt-zacht">Toegevoegd</dt>
                <dd className="mt-0.5 font-semibold">{formatDate(lead.created_at)}</dd>
              </div>
            </dl>
            {lead.notes && <p className="mt-4 border-t border-lijn pt-4 text-[14px] whitespace-pre-line">{lead.notes}</p>}
          </Card>

          <Card title="Klant geworden?">
            {lead.client_id ? (
              <Link href={`/klanten/${lead.client_id}`} className="btn btn-secondary w-full">
                Naar klantfiche
              </Link>
            ) : (
              <>
                <p className="mb-3 text-[14px] text-inkt-zacht">Maakt een klantfiche aan met deze gegevens en zet de lead op Gewonnen.</p>
                <ConfirmButton
                  action={convertLeadAction.bind(null, id)}
                  confirm={`${lead.business_name} omzetten naar klant?`}
                  className="btn btn-primary w-full"
                >
                  Omzetten naar klant
                </ConfirmButton>
              </>
            )}
          </Card>

          <div className="flex justify-end">
            <ConfirmButton action={deleteLeadAction.bind(null, id)} confirm={`Lead "${lead.business_name}" en de volledige tijdlijn verwijderen?`}>
              Lead verwijderen
            </ConfirmButton>
          </div>
        </div>
      </div>
    </div>
  )
}
