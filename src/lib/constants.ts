import type {
  ActivityType,
  ClientStatus,
  ContentStatus,
  ContentType,
  ContractStatus,
  ExpenseCategory,
  LeadStatus,
  Outcome,
  Priority,
  ProjectStatus,
  QuoteStatus,
  TaskStatus,
  TemplateKind,
} from './types'

// Tone bepaalt de kleur van de badge (zie Badge-component).
export type Tone = 'neutral' | 'blue' | 'mint' | 'signal' | 'muted' | 'danger'

type Option<T extends string> = { value: T; label: string; tone: Tone }

export const CONTENT_STATUSES: Option<ContentStatus>[] = [
  { value: 'idee', label: 'Idee', tone: 'muted' },
  { value: 'script', label: 'Script', tone: 'neutral' },
  { value: 'opname', label: 'Opname', tone: 'blue' },
  { value: 'montage', label: 'Montage', tone: 'blue' },
  { value: 'feedback', label: 'Feedback klant', tone: 'signal' },
  { value: 'goedgekeurd', label: 'Goedgekeurd', tone: 'mint' },
  { value: 'ingepland', label: 'Ingepland', tone: 'mint' },
  { value: 'gepost', label: 'Gepost', tone: 'muted' },
]

export const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: 'reel', label: 'Reel' },
  { value: 'post', label: 'Post' },
  { value: 'carrousel', label: 'Carrousel' },
  { value: 'story', label: 'Story' },
  { value: 'video', label: 'Video' },
]

export const PLATFORMS = ['Instagram', 'TikTok', 'Facebook', 'LinkedIn', 'YouTube'] as const

export const CLIENT_STATUSES: Option<ClientStatus>[] = [
  { value: 'lead', label: 'Lead', tone: 'neutral' },
  { value: 'actief', label: 'Actief', tone: 'mint' },
  { value: 'gepauzeerd', label: 'Gepauzeerd', tone: 'signal' },
  { value: 'gestopt', label: 'Gestopt', tone: 'muted' },
]

export const CONTRACT_STATUSES: Option<ContractStatus>[] = [
  { value: 'actief', label: 'Actief', tone: 'mint' },
  { value: 'verlengd', label: 'Verlengd', tone: 'muted' },
  { value: 'gestopt', label: 'Gestopt', tone: 'muted' },
]

export const PROJECT_STATUSES: Option<ProjectStatus>[] = [
  { value: 'gepland', label: 'Gepland', tone: 'neutral' },
  { value: 'lopend', label: 'Lopend', tone: 'blue' },
  { value: 'review', label: 'Review', tone: 'signal' },
  { value: 'on_hold', label: 'On hold', tone: 'muted' },
  { value: 'afgerond', label: 'Afgerond', tone: 'mint' },
]

export const TASK_STATUSES: Option<TaskStatus>[] = [
  { value: 'todo', label: 'To do', tone: 'neutral' },
  { value: 'bezig', label: 'Bezig', tone: 'blue' },
  { value: 'review', label: 'Review', tone: 'signal' },
  { value: 'klaar', label: 'Klaar', tone: 'mint' },
]

export const PRIORITIES: Option<Priority>[] = [
  { value: 'laag', label: 'Laag', tone: 'muted' },
  { value: 'normaal', label: 'Normaal', tone: 'neutral' },
  { value: 'hoog', label: 'Hoog', tone: 'danger' },
]

export const QUOTE_STATUSES: Option<QuoteStatus>[] = [
  { value: 'concept', label: 'Concept', tone: 'muted' },
  { value: 'verstuurd', label: 'Verstuurd', tone: 'blue' },
  { value: 'bevestigd', label: 'Bevestigd', tone: 'mint' },
  { value: 'afgewezen', label: 'Afgewezen', tone: 'danger' },
]

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'materiaal', label: 'Materiaal' },
  { value: 'software', label: 'Software' },
  { value: 'advertenties', label: 'Advertenties' },
  { value: 'verplaatsing', label: 'Verplaatsing' },
  { value: 'overig', label: 'Overig' },
]

export const LEAD_STATUSES: Option<LeadStatus>[] = [
  { value: 'nieuw', label: 'Nieuw', tone: 'muted' },
  { value: 'gecontacteerd', label: 'Gecontacteerd', tone: 'neutral' },
  { value: 'opvolgen', label: 'Opvolgen', tone: 'signal' },
  { value: 'gesprek', label: 'Gesprek gepland', tone: 'blue' },
  { value: 'offerte', label: 'Offerte', tone: 'blue' },
  { value: 'gewonnen', label: 'Gewonnen', tone: 'mint' },
  { value: 'verloren', label: 'Verloren', tone: 'danger' },
]

export const OUTCOMES: Option<Outcome>[] = [
  { value: 'geen_antwoord', label: 'Geen antwoord', tone: 'muted' },
  { value: 'terugbellen', label: 'Terugbellen', tone: 'signal' },
  { value: 'interesse', label: 'Interesse', tone: 'blue' },
  { value: 'afspraak', label: 'Afspraak gemaakt', tone: 'mint' },
  { value: 'geen_interesse', label: 'Geen interesse', tone: 'danger' },
]

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  email: 'E-mail',
  telefoon: 'Telefoon',
  bezoek: 'Bezoek',
  notitie: 'Notitie',
  status: 'Status',
}

export const TEMPLATE_KINDS: { value: TemplateKind; label: string }[] = [
  { value: 'eerste', label: 'Eerste contact' },
  { value: 'opvolging', label: 'Opvolging' },
  { value: 'na_gesprek', label: 'Na gesprek' },
]

export const SECTORS = ['Horeca', 'Retail', 'Kapper / beauty', 'Sport & fitness', 'Bouw & renovatie', 'Zorg & welzijn', 'Vrije beroepen', 'Vrije tijd', 'Andere'] as const

/** Hoeveel dagen na een contactmoment we standaard opvolgen. */
export const FOLLOW_UP_DAYS = { email: 4, geen_antwoord: 3, terugbellen: 2, interesse: 3, afspraak: 1 } as const

// Binnen hoeveel dagen een contract als "loopt bijna af" telt.
export const CONTRACT_WARNING_DAYS = 45

export function optionFor<T extends string>(options: Option<T>[], value: T): Option<T> {
  return options.find((o) => o.value === value) ?? { value, label: value, tone: 'neutral' }
}
