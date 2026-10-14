-- Studio Kruispunt CRM: volledig schema
-- Bedragen zijn altijd excl. btw.

create extension if not exists pgcrypto;

-- ─── Klanten ───────────────────────────────────────────────────────────────
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  email text,
  phone text,
  vat_number text,
  address text,
  city text,
  website text,
  instagram text,
  tiktok text,
  facebook text,
  linkedin text,
  drive_url text,
  status text not null default 'actief' check (status in ('lead', 'actief', 'gepauzeerd', 'gestopt')),
  notes text,
  created_at timestamptz not null default now()
);

-- ─── Profielen (team en klant-logins) ──────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'client' check (role in ('team', 'client')),
  client_id uuid references public.clients (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- De rol komt uit app_metadata (enkel instelbaar met de service-role key),
-- nooit uit user_metadata, zodat niemand zichzelf teamrechten kan geven.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role, client_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    case when new.raw_app_meta_data ->> 'role' = 'team' then 'team' else 'client' end,
    nullif(new.raw_app_meta_data ->> 'client_id', '')::uuid
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_team()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'team');
$$;

create or replace function public.my_client_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select client_id from public.profiles where id = (select auth.uid()) and role = 'client';
$$;

-- ─── Contracten / retainers ────────────────────────────────────────────────
create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  package text not null,
  monthly_amount numeric(10, 2) not null default 0,
  start_date date not null,
  end_date date not null,
  status text not null default 'actief' check (status in ('actief', 'verlengd', 'gestopt')),
  notes text,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

-- ─── Projecten en taken ────────────────────────────────────────────────────
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete set null,
  title text not null,
  description text,
  budget numeric(10, 2),
  deadline date,
  owner_id uuid references public.profiles (id) on delete set null,
  status text not null default 'gepland' check (status in ('gepland', 'lopend', 'review', 'afgerond', 'on_hold')),
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'bezig', 'review', 'klaar')),
  priority text not null default 'normaal' check (priority in ('laag', 'normaal', 'hoog')),
  assignee_id uuid references public.profiles (id) on delete set null,
  due_date date,
  position double precision not null default 0,
  created_at timestamptz not null default now()
);

-- ─── Offertes en kosten ────────────────────────────────────────────────────
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  number text,
  title text not null,
  amount numeric(10, 2) not null default 0,
  status text not null default 'concept' check (status in ('concept', 'verstuurd', 'bevestigd', 'afgewezen')),
  issue_date date not null default current_date,
  accepted_date date,
  notes text,
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  description text not null,
  category text not null default 'overig' check (category in ('freelancer', 'materiaal', 'software', 'advertenties', 'verplaatsing', 'overig')),
  amount numeric(10, 2) not null default 0,
  expense_date date not null default current_date,
  created_at timestamptz not null default now()
);

-- ─── Content (posts en video's) ────────────────────────────────────────────
create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  title text not null,
  type text not null default 'reel' check (type in ('post', 'reel', 'video', 'story', 'carrousel')),
  platforms text[] not null default '{}',
  status text not null default 'idee' check (status in ('idee', 'script', 'opname', 'montage', 'feedback', 'goedgekeurd', 'ingepland', 'gepost')),
  drive_url text,
  caption text,
  planned_date date,
  posted_url text,
  assignee_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_comments (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  body text not null check (length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);

-- ─── Meldingen ─────────────────────────────────────────────────────────────
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text,
  link text,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

-- ─── Indexen ───────────────────────────────────────────────────────────────
create index on public.profiles (client_id);
create index on public.contracts (client_id);
create index on public.contracts (end_date);
create index on public.projects (client_id);
create index on public.projects (owner_id);
create index on public.tasks (project_id);
create index on public.tasks (assignee_id);
create index on public.quotes (client_id);
create index on public.quotes (project_id);
create index on public.expenses (client_id);
create index on public.expenses (project_id);
create index on public.content_items (client_id);
create index on public.content_items (project_id);
create index on public.content_items (assignee_id);
create index on public.content_comments (content_item_id);
create index on public.content_comments (author_id);
create index on public.notifications (user_id, read_at);

-- ─── Row Level Security ────────────────────────────────────────────────────
alter table public.clients enable row level security;
alter table public.profiles enable row level security;
alter table public.contracts enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.quotes enable row level security;
alter table public.expenses enable row level security;
alter table public.content_items enable row level security;
alter table public.content_comments enable row level security;
alter table public.notifications enable row level security;

-- Team: volledige toegang tot alle bedrijfsdata
create policy "team alles" on public.clients for all to authenticated using ((select public.is_team())) with check ((select public.is_team()));
create policy "team alles" on public.contracts for all to authenticated using ((select public.is_team())) with check ((select public.is_team()));
create policy "team alles" on public.projects for all to authenticated using ((select public.is_team())) with check ((select public.is_team()));
create policy "team alles" on public.tasks for all to authenticated using ((select public.is_team())) with check ((select public.is_team()));
create policy "team alles" on public.quotes for all to authenticated using ((select public.is_team())) with check ((select public.is_team()));
create policy "team alles" on public.expenses for all to authenticated using ((select public.is_team())) with check ((select public.is_team()));
create policy "team alles" on public.content_items for all to authenticated using ((select public.is_team())) with check ((select public.is_team()));
create policy "team alles" on public.content_comments for all to authenticated using ((select public.is_team())) with check ((select public.is_team()));

-- Profielen: team ziet iedereen, iedereen ziet zichzelf, klanten zien het team (namen bij feedback)
create policy "profielen lezen" on public.profiles for select to authenticated
  using ((select public.is_team()) or id = (select auth.uid()) or role = 'team');
create policy "team beheert profielen" on public.profiles for update to authenticated
  using ((select public.is_team())) with check ((select public.is_team()));

-- Klanten: enkel hun eigen klantfiche en content
create policy "klant leest eigen fiche" on public.clients for select to authenticated
  using (id = (select public.my_client_id()));
create policy "klant leest eigen content" on public.content_items for select to authenticated
  using (client_id = (select public.my_client_id()));
create policy "klant leest feedback op eigen content" on public.content_comments for select to authenticated
  using (exists (
    select 1 from public.content_items ci
    where ci.id = content_item_id and ci.client_id = (select public.my_client_id())
  ));
create policy "klant plaatst feedback op eigen content" on public.content_comments for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.content_items ci
      where ci.id = content_item_id and ci.client_id = (select public.my_client_id())
    )
  );

-- Meldingen: enkel je eigen
create policy "eigen meldingen lezen" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy "eigen meldingen bijwerken" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "eigen meldingen verwijderen" on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

-- updated_at bijhouden op content
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger content_items_touch before update on public.content_items
  for each row execute function public.touch_updated_at();

revoke execute on function public.handle_new_user() from public, anon, authenticated;
