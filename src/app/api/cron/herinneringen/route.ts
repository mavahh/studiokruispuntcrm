import { NextResponse, type NextRequest } from 'next/server'
import { addDaysISO, formatDate, relativeDays, todayISO } from '@/lib/format'
import { notify, teamIds } from '@/lib/notify'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/** Dagelijks (Vercel Cron): herinneringen voor taken, projecten, contracten en geplande content. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const today = todayISO()
  const team = await teamIds()
  let sent = 0

  // Taken met deadline vandaag of morgen, of te laat
  const { data: tasks } = await admin
    .from('tasks')
    .select('id, title, due_date, assignee_id, project_id')
    .neq('status', 'klaar')
    .not('due_date', 'is', null)
    .lte('due_date', addDaysISO(today, 1))
  for (const t of tasks ?? []) {
    const overdue = t.due_date < today
    await notify(t.assignee_id ? [t.assignee_id] : team, {
      title: overdue ? `Taak te laat: ${t.title}` : `Deadline ${relativeDays(t.due_date)}: ${t.title}`,
      body: `Deadline: ${formatDate(t.due_date)}.`,
      link: `/projecten/${t.project_id}`,
      // Eén herinnering op de dag ervoor, één op de dag zelf, en één wanneer ze te laat is.
      dedupeKey: `task-${t.id}-${t.due_date}-${overdue ? 'late' : t.due_date === today ? 'today' : 'tomorrow'}`,
    })
    sent++
  }

  // Projecten met deadline binnen 3 dagen
  const { data: projects } = await admin
    .from('projects')
    .select('id, title, deadline, owner_id')
    .not('status', 'in', '(afgerond,on_hold)')
    .not('deadline', 'is', null)
    .gte('deadline', today)
    .lte('deadline', addDaysISO(today, 3))
  for (const p of projects ?? []) {
    await notify(p.owner_id ? [p.owner_id] : team, {
      title: `Projectdeadline ${relativeDays(p.deadline)}: ${p.title}`,
      body: `Deadline: ${formatDate(p.deadline)}.`,
      link: `/projecten/${p.id}`,
      dedupeKey: `project-${p.id}-${p.deadline}`,
    })
    sent++
  }

  // Contracten die aflopen: melding op 45 en op 14 dagen
  const { data: contracts } = await admin
    .from('contracts')
    .select('id, package, end_date, client_id, clients(name)')
    .eq('status', 'actief')
    .lte('end_date', addDaysISO(today, 45))
  for (const c of contracts ?? []) {
    const stage = c.end_date <= addDaysISO(today, 14) ? '14' : '45'
    const name = (c.clients as unknown as { name: string } | null)?.name ?? 'Klant'
    await notify(team, {
      title: `Contract ${name} loopt af ${relativeDays(c.end_date)}`,
      body: `${c.package} eindigt op ${formatDate(c.end_date)}. Tijd om te verlengen.`,
      link: `/klanten/${c.client_id}?tab=contracten`,
      dedupeKey: `contract-${c.id}-${c.end_date}-${stage}`,
    })
    sent++
  }

  // Content die vandaag gepland staat maar nog niet ingepland is
  const { data: content } = await admin
    .from('content_items')
    .select('id, title, assignee_id, clients(name)')
    .eq('planned_date', today)
    .not('status', 'in', '(ingepland,gepost)')
  for (const i of content ?? []) {
    const name = (i.clients as unknown as { name: string } | null)?.name ?? ''
    await notify(i.assignee_id ? [i.assignee_id] : team, {
      title: `Vandaag gepland maar nog niet klaar: ${i.title}`,
      body: name,
      link: `/content/${i.id}`,
      dedupeKey: `content-${i.id}-${today}`,
    })
    sent++
  }

  return NextResponse.json({ ok: true, checked: sent })
}
