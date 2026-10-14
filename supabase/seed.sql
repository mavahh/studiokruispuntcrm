-- Demodata voor lokale ontwikkeling (npx supabase db reset). Wordt NIET op productie gezet.
insert into public.clients (id, name, contact_name, email, phone, city, instagram, drive_url, status) values
  ('11111111-1111-1111-1111-111111111111', 'Panterland', 'Sofie Peeters', 'sofie@panterland.be', '014 12 34 56', 'Mol', '@panterland', 'https://drive.google.com/drive/folders/demo-panterland', 'actief'),
  ('22222222-2222-2222-2222-222222222222', 'Process Sport', 'Jens Vermeulen', 'jens@processsport.be', '0470 12 34 56', 'Geel', '@processsport', null, 'actief'),
  ('33333333-3333-3333-3333-333333333333', 'Buitenblik', 'An Claes', 'an@buitenblik.be', null, 'Balen', '@buitenblik', null, 'actief'),
  ('44444444-4444-4444-4444-444444444444', 'Bakkerij De Kempen', 'Tom Janssens', 'tom@bakkerijdekempen.be', null, 'Dessel', null, null, 'lead');

insert into public.contracts (client_id, package, monthly_amount, start_date, end_date) values
  ('11111111-1111-1111-1111-111111111111', 'Groei', 850, (current_date - interval '11 months')::date, (current_date + interval '20 days')::date),
  ('22222222-2222-2222-2222-222222222222', 'Starter', 650, (date_trunc('year', current_date))::date, (date_trunc('year', current_date) + interval '1 year - 1 day')::date),
  ('33333333-3333-3333-3333-333333333333', 'Pro', 1150, (current_date - interval '3 months')::date, (current_date + interval '9 months')::date);

insert into public.quotes (client_id, title, number, amount, status, issue_date, accepted_date) values
  ('22222222-2222-2222-2222-222222222222', 'Bedrijfsvideo + 3 reels', 'OFF-2026-014', 2400, 'bevestigd', current_date - 40, current_date - 30),
  ('44444444-4444-4444-4444-444444444444', 'Opstartpakket social media', 'OFF-2026-015', 1500, 'verstuurd', current_date - 5, null);

insert into public.expenses (client_id, description, category, amount, expense_date) values
  ('22222222-2222-2222-2222-222222222222', 'Freelance drone-operator', 'freelancer', 450, current_date - 25),
  (null, 'Adobe Creative Cloud', 'software', 89.99, current_date - 10);

insert into public.projects (id, client_id, title, budget, deadline, status, owner_id) values
  ('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 'Bedrijfsvideo Process Sport', 2400, current_date + 12, 'lopend', (select id from public.profiles where email = 'liam@studiokruispunt.be')),
  ('66666666-6666-6666-6666-666666666666', null, 'Nieuwe website Studio Kruispunt', null, current_date + 30, 'gepland', (select id from public.profiles where email = 'cedric@studiokruispunt.be'));

insert into public.tasks (project_id, title, status, priority, due_date, assignee_id, position) values
  ('55555555-5555-5555-5555-555555555555', 'Script uitschrijven', 'klaar', 'normaal', current_date - 3, (select id from public.profiles where email = 'liam@studiokruispunt.be'), 1),
  ('55555555-5555-5555-5555-555555555555', 'Shoot plannen met Jens', 'bezig', 'hoog', current_date + 1, (select id from public.profiles where email = 'liam@studiokruispunt.be'), 2),
  ('55555555-5555-5555-5555-555555555555', 'Drone-opnames', 'todo', 'normaal', current_date + 5, (select id from public.profiles where email = 'cedric@studiokruispunt.be'), 3),
  ('55555555-5555-5555-5555-555555555555', 'Montage eerste versie', 'todo', 'normaal', current_date + 9, null, 4),
  ('66666666-6666-6666-6666-666666666666', 'Foto''s comprimeren naar WebP', 'todo', 'hoog', current_date + 2, (select id from public.profiles where email = 'cedric@studiokruispunt.be'), 1);

insert into public.content_items (client_id, title, type, platforms, status, drive_url, planned_date, caption) values
  ('11111111-1111-1111-1111-111111111111', 'Reel: spelavond achter de schermen', 'reel', '{Instagram,TikTok}', 'feedback', 'https://drive.google.com/file/d/demo1', current_date + 3, 'Vrijdag = spelavond 🎲 Wie daagt ons uit?'),
  ('11111111-1111-1111-1111-111111111111', 'Carrousel: top 5 bordspellen', 'carrousel', '{Instagram}', 'montage', null, current_date + 6, null),
  ('11111111-1111-1111-1111-111111111111', 'Reel: nieuwe spellen in de kast', 'reel', '{Instagram,TikTok}', 'gepost', 'https://drive.google.com/file/d/demo2', current_date - 4, null),
  ('22222222-2222-2222-2222-222222222222', 'Video: trainer aan het woord', 'video', '{Instagram,Facebook}', 'opname', null, current_date + 8, null),
  ('22222222-2222-2222-2222-222222222222', 'Post: nieuw zomeruurrooster', 'post', '{Facebook}', 'ingepland', 'https://drive.google.com/file/d/demo3', current_date + 1, null),
  ('33333333-3333-3333-3333-333333333333', 'Reel: herfstwandeling', 'reel', '{Instagram}', 'idee', null, null, null);
