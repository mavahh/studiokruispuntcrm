import {
  CLIENT_STATUSES,
  CONTENT_STATUSES,
  CONTENT_TYPES,
  CONTRACT_STATUSES,
  EXPENSE_CATEGORIES,
  LEAD_STATUSES,
  PLATFORMS,
  PRIORITIES,
  PROJECT_STATUSES,
  QUOTE_STATUSES,
  SECTORS,
  TASK_STATUSES,
  TEMPLATE_KINDS,
} from '@/lib/constants'
import { todayISO } from '@/lib/format'
import type { Client, ContentItem, Contract, EmailTemplate, Expense, Lead, Profile, Project, Quote, Task } from '@/lib/types'
import { CheckboxGroup, Grid, SelectField, TextArea, TextField } from './ui/fields'

export type Opt = { value: string; label: string }

export const clientOptions = (clients: Pick<Client, 'id' | 'name'>[]): Opt[] => clients.map((c) => ({ value: c.id, label: c.name }))
export const teamOptions = (team: Profile[]): Opt[] => team.map((p) => ({ value: p.id, label: p.full_name || p.email }))
export const projectOptions = (projects: Pick<Project, 'id' | 'title'>[]): Opt[] => projects.map((p) => ({ value: p.id, label: p.title }))

export function ClientFields({ client }: { client?: Partial<Client> }) {
  return (
    <>
      <Grid>
        <TextField label="Naam zaak" name="name" required defaultValue={client?.name} />
        <SelectField label="Status" name="status" options={CLIENT_STATUSES} defaultValue={client?.status ?? 'actief'} />
        <TextField label="Contactpersoon" name="contact_name" defaultValue={client?.contact_name} />
        <TextField label="E-mail" name="email" type="email" defaultValue={client?.email} />
        <TextField label="Telefoon" name="phone" type="tel" defaultValue={client?.phone} />
        <TextField label="Btw-nummer" name="vat_number" defaultValue={client?.vat_number} placeholder="BE0123.456.789" />
        <TextField label="Adres" name="address" defaultValue={client?.address} />
        <TextField label="Gemeente" name="city" defaultValue={client?.city} placeholder="Mol" />
      </Grid>
      <TextField
        label="Google Drive-map"
        name="drive_url"
        type="url"
        defaultValue={client?.drive_url}
        placeholder="https://drive.google.com/drive/folders/…"
        hint="De gedeelde map met alle beelden van deze klant."
      />
      <Grid>
        <TextField label="Website" name="website" defaultValue={client?.website} placeholder="www.voorbeeld.be" />
        <TextField label="Instagram" name="instagram" defaultValue={client?.instagram} placeholder="@account" />
        <TextField label="TikTok" name="tiktok" defaultValue={client?.tiktok} placeholder="@account" />
        <TextField label="Facebook" name="facebook" defaultValue={client?.facebook} />
      </Grid>
      <TextField label="LinkedIn" name="linkedin" defaultValue={client?.linkedin} />
      <TextArea label="Notities" name="notes" defaultValue={client?.notes} rows={4} />
    </>
  )
}

export function ContractFields({ contract, clients, clientId }: { contract?: Partial<Contract>; clients?: Opt[]; clientId?: string }) {
  const start = contract?.start_date ?? todayISO()
  return (
    <>
      {clientId ? (
        <input type="hidden" name="client_id" value={clientId} />
      ) : (
        <SelectField label="Klant" name="client_id" required options={clients ?? []} defaultValue={contract?.client_id} emptyLabel="Kies een klant" />
      )}
      <Grid>
        <TextField label="Pakket" name="package" required defaultValue={contract?.package} placeholder="Starter, Groei, Pro…" />
        <TextField label="Bedrag per maand (excl. btw)" name="monthly_amount" type="number" step="0.01" min="0" required defaultValue={contract?.monthly_amount} />
        <TextField label="Startdatum" name="start_date" type="date" required defaultValue={start} />
        <TextField label="Einddatum" name="end_date" type="date" required defaultValue={contract?.end_date} />
      </Grid>
      <SelectField label="Status" name="status" options={CONTRACT_STATUSES} defaultValue={contract?.status ?? 'actief'} />
      <TextArea label="Notities" name="notes" defaultValue={contract?.notes} />
    </>
  )
}

export function ProjectFields({ project, clients, team, clientId }: { project?: Partial<Project>; clients: Opt[]; team: Opt[]; clientId?: string }) {
  return (
    <>
      <TextField label="Titel" name="title" required defaultValue={project?.title} />
      <Grid>
        <SelectField label="Klant" name="client_id" options={clients} defaultValue={project?.client_id ?? clientId} emptyLabel="Intern / geen klant" />
        <SelectField label="Verantwoordelijke" name="owner_id" options={team} defaultValue={project?.owner_id} emptyLabel="Niemand" />
        <TextField label="Budget (excl. btw)" name="budget" type="number" step="0.01" min="0" defaultValue={project?.budget} />
        <TextField label="Deadline" name="deadline" type="date" defaultValue={project?.deadline} />
      </Grid>
      <SelectField label="Status" name="status" options={PROJECT_STATUSES} defaultValue={project?.status ?? 'gepland'} />
      <TextArea label="Omschrijving" name="description" defaultValue={project?.description} rows={4} />
    </>
  )
}

export function TaskFields({ task, team }: { task?: Partial<Task>; team: Opt[] }) {
  return (
    <>
      <TextField label="Taak" name="title" required defaultValue={task?.title} />
      <Grid>
        <SelectField label="Toegewezen aan" name="assignee_id" options={team} defaultValue={task?.assignee_id} emptyLabel="Niemand" />
        <TextField label="Deadline" name="due_date" type="date" defaultValue={task?.due_date} />
        <SelectField label="Status" name="status" options={TASK_STATUSES} defaultValue={task?.status ?? 'todo'} />
        <SelectField label="Prioriteit" name="priority" options={PRIORITIES} defaultValue={task?.priority ?? 'normaal'} />
      </Grid>
      <TextArea label="Details" name="description" defaultValue={task?.description} />
    </>
  )
}

export function ContentFields({
  item,
  clients,
  projects,
  team,
  clientId,
}: {
  item?: Partial<ContentItem>
  clients: Opt[]
  projects: Opt[]
  team: Opt[]
  clientId?: string
}) {
  return (
    <>
      <TextField label="Titel" name="title" required defaultValue={item?.title} placeholder="Reel: achter de schermen in de keuken" />
      <Grid>
        {clientId ? (
          <input type="hidden" name="client_id" value={clientId} />
        ) : (
          <SelectField label="Klant" name="client_id" required options={clients} defaultValue={item?.client_id} emptyLabel="Kies een klant" />
        )}
        <SelectField label="Type" name="type" options={CONTENT_TYPES} defaultValue={item?.type ?? 'reel'} />
        <SelectField label="Status" name="status" options={CONTENT_STATUSES} defaultValue={item?.status ?? 'idee'} />
        <TextField label="Plandatum" name="planned_date" type="date" defaultValue={item?.planned_date} />
        <SelectField label="Verantwoordelijke" name="assignee_id" options={team} defaultValue={item?.assignee_id} emptyLabel="Niemand" />
        <SelectField label="Project" name="project_id" options={projects} defaultValue={item?.project_id} emptyLabel="Geen project" />
      </Grid>
      <CheckboxGroup label="Platformen" name="platforms" options={PLATFORMS} defaultValues={item?.platforms ?? ['Instagram']} />
      <TextField
        label="Google Drive-link"
        name="drive_url"
        type="url"
        defaultValue={item?.drive_url}
        placeholder="https://drive.google.com/file/d/…"
        hint="Zet de deelinstelling op 'Iedereen met de link' zodat de klant het kan bekijken."
      />
      <TextArea label="Caption" name="caption" defaultValue={item?.caption} rows={4} />
      <TextField label="Link naar gepubliceerde post" name="posted_url" type="url" defaultValue={item?.posted_url} />
    </>
  )
}

export function QuoteFields({ quote, clients, projects }: { quote?: Partial<Quote>; clients: Opt[]; projects: Opt[] }) {
  return (
    <>
      <TextField label="Titel" name="title" required defaultValue={quote?.title} placeholder="Bedrijfsvideo + 3 reels" />
      <Grid>
        <SelectField label="Klant" name="client_id" options={clients} defaultValue={quote?.client_id} emptyLabel="Geen klant" />
        <SelectField label="Project" name="project_id" options={projects} defaultValue={quote?.project_id} emptyLabel="Geen project" />
        <TextField label="Offertenummer" name="number" defaultValue={quote?.number} placeholder="OFF-2026-014" />
        <TextField label="Bedrag (excl. btw)" name="amount" type="number" step="0.01" min="0" required defaultValue={quote?.amount} />
        <TextField label="Offertedatum" name="issue_date" type="date" defaultValue={quote?.issue_date ?? todayISO()} />
        <SelectField label="Status" name="status" options={QUOTE_STATUSES} defaultValue={quote?.status ?? 'verstuurd'} />
      </Grid>
      <TextField
        label="Datum bevestigd"
        name="accepted_date"
        type="date"
        defaultValue={quote?.accepted_date}
        hint="Telt als omzet in dit kwartaal. Leeg = vandaag, zodra de status 'Bevestigd' is."
      />
      <TextArea label="Notities" name="notes" defaultValue={quote?.notes} />
    </>
  )
}

export function ExpenseFields({ expense, clients, projects }: { expense?: Partial<Expense>; clients: Opt[]; projects: Opt[] }) {
  return (
    <>
      <TextField label="Omschrijving" name="description" required defaultValue={expense?.description} placeholder="Freelance editor, maart" />
      <Grid>
        <TextField label="Bedrag (excl. btw)" name="amount" type="number" step="0.01" min="0" required defaultValue={expense?.amount} />
        <TextField label="Datum" name="expense_date" type="date" defaultValue={expense?.expense_date ?? todayISO()} />
        <SelectField label="Categorie" name="category" options={EXPENSE_CATEGORIES} defaultValue={expense?.category ?? 'overig'} />
        <SelectField label="Klant" name="client_id" options={clients} defaultValue={expense?.client_id} emptyLabel="Algemeen" />
      </Grid>
      <SelectField label="Project" name="project_id" options={projects} defaultValue={expense?.project_id} emptyLabel="Geen project" />
    </>
  )
}

export function LeadFields({ lead, team }: { lead?: Partial<Lead>; team: Opt[] }) {
  return (
    <>
      <Grid>
        <TextField label="Naam zaak" name="business_name" required defaultValue={lead?.business_name} />
        <TextField label="Contactpersoon" name="contact_name" defaultValue={lead?.contact_name} placeholder="Voornaam Achternaam" />
        <TextField label="E-mail" name="email" type="email" defaultValue={lead?.email} />
        <TextField label="Telefoon" name="phone" type="tel" defaultValue={lead?.phone} />
        <TextField label="Gemeente" name="city" defaultValue={lead?.city} placeholder="Geel" />
        <SelectField
          label="Sector"
          name="sector"
          options={[...SECTORS, ...(lead?.sector && !(SECTORS as readonly string[]).includes(lead.sector) ? [lead.sector] : [])].map((s) => ({ value: s, label: s }))}
          defaultValue={lead?.sector}
          emptyLabel="Kies een sector"
        />
        <TextField label="Instagram" name="instagram" defaultValue={lead?.instagram} placeholder="@account" />
        <TextField label="Website" name="website" defaultValue={lead?.website} placeholder="www.voorbeeld.be" />
        <SelectField label="Verantwoordelijke" name="owner_id" options={team} defaultValue={lead?.owner_id} emptyLabel={lead?.id ? "Niemand" : "Ik"} />
        <TextField label="Volgende opvolging" name="next_follow_up" type="date" defaultValue={lead?.next_follow_up} />
      </Grid>
      {!lead?.id && <SelectField label="Status" name="status" options={LEAD_STATUSES} defaultValue="nieuw" />}
      <TextArea label="Notities" name="notes" defaultValue={lead?.notes} rows={3} placeholder="Wat weet je al over deze zaak? De AI gebruikt dit om de mail persoonlijk te maken." />
      <label className="flex items-center gap-2 text-[14px]">
        <input type="checkbox" name="do_not_contact" defaultChecked={lead?.do_not_contact ?? false} />
        Niet meer contacteren (vroeg om geen mails meer)
      </label>
    </>
  )
}

export function TemplateFields({ template }: { template?: Partial<EmailTemplate> }) {
  return (
    <>
      <Grid>
        <TextField label="Naam" name="name" required defaultValue={template?.name} />
        <SelectField label="Soort" name="kind" options={TEMPLATE_KINDS} defaultValue={template?.kind ?? 'eerste'} />
      </Grid>
      <TextField label="Onderwerp" name="subject" required defaultValue={template?.subject} />
      <TextArea
        label="Tekst"
        name="body"
        required
        rows={12}
        defaultValue={template?.body}
        hint="Invulvelden: {voornaam}, {contact}, {zaak}, {gemeente}, {sector}, {afzender}"
      />
    </>
  )
}
