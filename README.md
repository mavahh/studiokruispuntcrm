# Studio Kruispunt CRM

Op maat gemaakte CRM voor Studio Kruispunt: klanten, content (posts en video's), projecten met taken, contracten (retainers), offertes, kosten en een klantportaal. Gebouwd in het Kruispunt-design systeem (Nacht, Kruispunt Blauw, Mint, Papier; korte ease-out-animaties).

**Stack:** Next.js 16 (App Router, server actions) · Supabase (Postgres, Auth, RLS) · Tailwind CSS 4 · Vercel (hosting + dagelijkse cron) · Resend (optioneel, e-mailmeldingen)

## Functies

| Onderdeel | Wat |
| --- | --- |
| **Dashboard** | Actieve klanten, maandelijkse retainers, omzet en winst van dit kwartaal, contracten die bijna aflopen, je taken, content die op feedback wacht, recente klantfeedback, planning van deze week |
| **Klanten** | Overzicht met zoeken en filter; klantfiche met tabbladen: overzicht, content, projecten, contracten, financiën, portaal |
| **Content** | Pipeline *Idee → Script → Opname → Montage → Feedback klant → Goedgekeurd → Ingepland → Gepost* als kanbanbord (slepen) of lijst; Google Drive-links; caption, plandatum, platformen; feedbackgesprek per item |
| **Projecten** | Titel, klant, budget, deadline, verantwoordelijke, status. Taken als kanbanbord én lijst, met toewijzing, prioriteit en deadline |
| **Contracten** | Retainers met looptijd; waarschuwing vanaf 45 dagen voor het einde; verlengen in één klik |
| **Omzet & winst** | Per kwartaal en per jaar: retainers + bevestigde offertes − kosten; per klant; offertes en kosten beheren |
| **Klantportaal** | Klant logt in met een login die jullie aanmaken, ziet enkel eigen content, bekijkt via Drive, geeft feedback, keurt goed of vraagt aanpassingen |
| **Meldingen** | In de app + e-mail: klantfeedback, goedkeuring, toegewezen taken, content klaar voor feedback (naar de klant), dagelijkse herinneringen (deadlines, aflopende contracten) |

Alle bedragen zijn excl. btw.

## Lokaal draaien

Vereist Node 20+ en Docker (voor een lokale Supabase).

```bash
npm install
npx supabase start          # start Postgres + Auth lokaal en past de migratie toe
cp .env.example .env.local  # vul de lokale URL en keys in die 'supabase start' toont
npx supabase db reset       # optioneel: laadt demodata uit supabase/seed.sql
npm run teamlid -- liam@studiokruispunt.be "Liam" een-sterk-wachtwoord
npm run dev
```

## Productie: Supabase

1. **Schema:** voer `supabase/migrations/20261014000000_schema.sql` uit in de SQL Editor van je Supabase-project (of `npx supabase link` + `npx supabase db push`).
2. **Registratie uitzetten:** *Authentication → Sign In / Providers →* zet **Allow new users to sign up** uit. Laat de e-mailprovider aan. Accounts worden enkel door jullie aangemaakt.
3. **Site URL:** *Authentication → URL Configuration →* `https://crm.studiokruispunt.be`.
4. **Teamaccounts** (Liam en Cedric): zet de productie-keys in `.env.local` en draai `npm run teamlid -- <email> "<naam>" <wachtwoord>`, één keer per persoon.
5. **Klantlogins** maak je in de CRM zelf: *Klant → Portaal → Login aanmaken*.

## Productie: Vercel

Importeer de repo in Vercel (framework: Next.js) en zet deze environment variables:

| Variabele | Waarde |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role / secret key (**geheim**, enkel server) |
| `NEXT_PUBLIC_SITE_URL` | `https://crm.studiokruispunt.be` |
| `CRON_SECRET` | een lange willekeurige string |
| `RESEND_API_KEY` | optioneel, voor e-mailmeldingen |
| `EMAIL_FROM` | bv. `Studio Kruispunt CRM <crm@studiokruispunt.be>` (domein verifiëren in Resend) |

De dagelijkse herinneringen draaien via Vercel Cron (`vercel.json`, elke dag om 6u UTC) op `/api/cron/herinneringen`.

### Domein crm.studiokruispunt.be

In Vercel: *Project → Settings → Domains →* `crm.studiokruispunt.be` toevoegen. Bij je DNS-beheerder een **CNAME**-record aanmaken: `crm` → `cname.vercel-dns.com`. De bestaande WordPress-site op `studiokruispunt.be` blijft ongemoeid.

## Beveiliging

- Row Level Security op elke tabel. Teamleden zien alles; klanten enkel hun eigen klantfiche, content en feedback.
- De rol (`team` / `client`) komt uit `app_metadata`, die enkel met de service-role key te wijzigen is. Niemand kan zichzelf teamrechten geven.
- Goedkeuren of aanpassingen vragen door een klant gebeurt server-side, na controle dat het item van die klant is en op "Feedback klant" staat.
- Klanten zien geen bedragen, contracten, projecten of andere klanten.

## Structuur

```
src/
  actions/         server actions (alle schrijfacties, met rechtencontrole)
  app/(team)/      teamomgeving: dashboard, klanten, content, projecten, taken, contracten, financiën
  app/portaal/     klantportaal
  app/api/cron/    dagelijkse herinneringen
  components/      UI (kanban, formulieren, tabellen, grafiek)
  lib/             Supabase-clients, financiële berekeningen, meldingen, opmaak
supabase/          migratie, lokale config en demodata
```
