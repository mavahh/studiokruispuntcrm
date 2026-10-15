-- Outreach: leads, contactmomenten en e-mailsjablonen (enkel voor het team)

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_name text,
  email text,
  phone text,
  city text,
  sector text,
  website text,
  instagram text,
  source text not null default 'handmatig',
  status text not null default 'nieuw' check (status in ('nieuw', 'gecontacteerd', 'opvolgen', 'gesprek', 'offerte', 'gewonnen', 'verloren')),
  owner_id uuid references public.profiles (id) on delete set null,
  next_follow_up date,
  last_contacted_at timestamptz,
  do_not_contact boolean not null default false,
  notes text,
  client_id uuid references public.clients (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  type text not null check (type in ('email', 'telefoon', 'bezoek', 'notitie', 'status')),
  subject text,
  body text,
  outcome text check (outcome in ('geen_antwoord', 'terugbellen', 'interesse', 'afspraak', 'geen_interesse')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'eerste' check (kind in ('eerste', 'opvolging', 'na_gesprek')),
  subject text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index on public.leads (status);
create index on public.leads (owner_id);
create index on public.leads (next_follow_up);
create index on public.leads (client_id);
create index on public.lead_activities (lead_id, created_at desc);
create index on public.lead_activities (created_by);

alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;
alter table public.email_templates enable row level security;

create policy "team alles" on public.leads for all to authenticated using ((select public.is_team())) with check ((select public.is_team()));
create policy "team alles" on public.lead_activities for all to authenticated using ((select public.is_team())) with check ((select public.is_team()));
create policy "team alles" on public.email_templates for all to authenticated using ((select public.is_team())) with check ((select public.is_team()));

-- Startsjablonen (aan te passen in de CRM)
insert into public.email_templates (name, kind, subject, body) values
(
  'Eerste mail',
  'eerste',
  'Social media voor {zaak}',
  'Dag {voornaam},

Ik ben {afzender} van Studio Kruispunt. We maken social media voor zaken in de Kempen: we komen langs, maken de foto''s en video''s en plannen alles in. Jij hoeft er alleen te zijn.

Ik volg {zaak} al een tijdje en denk dat er online nog veel meer in zit. Heb je zin in een vrijblijvende kennismaking van 30 minuten? Dan tonen we wat we bij andere zaken in {gemeente} en omgeving deden.

Groetjes,
{afzender}'
),
(
  'Opvolging',
  'opvolging',
  'Re: Social media voor {zaak}',
  'Dag {voornaam},

Ik stuur je nog even een berichtje over mijn vorige mail. Ik begrijp dat het druk is.

Zou een korte kennismaking van 30 minuten passen, bij jou in de zaak of online? Laat gerust weten wat je uitkomt.

Groetjes,
{afzender}'
),
(
  'Na gesprek',
  'na_gesprek',
  'Fijn gesprek, {voornaam}',
  'Dag {voornaam},

Bedankt voor het gesprek. Zoals beloofd vind je hieronder kort wat we voor {zaak} kunnen doen.

[Pakket en prijs, excl. btw]

Heb je nog vragen, bel of mail gerust.

Groetjes,
{afzender}'
);
