import type { Metadata } from 'next'
import { Plus } from 'lucide-react'
import { createProjectAction, setProjectStatusAction } from '@/actions/projects'
import { getTeam } from '@/lib/auth'
import { PROJECT_STATUSES } from '@/lib/constants'
import { formatDate, formatEuro } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Avatar, PageHeader } from '@/components/ui'
import { FormDialog } from '@/components/ui/form'
import { Kanban } from '@/components/kanban'
import { ViewToggle } from '@/components/content-views'
import { ProjectFields, clientOptions, teamOptions } from '@/components/forms'
import { ProjectsTable, type ProjectRow } from './projects-table'

export const metadata: Metadata = { title: 'Projecten' }

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ weergave?: string; wie?: string; klant?: string }> }) {
  const { weergave = 'lijst', wie = '', klant = '' } = await searchParams
  const supabase = await createClient()
  let query = supabase.from('projects').select('*, clients(name), tasks(status)').order('deadline', { ascending: true, nullsFirst: false })
  if (wie) query = query.eq('owner_id', wie)
  if (klant) query = query.eq('client_id', klant)
  const [{ data }, team, { data: clients }] = await Promise.all([query, getTeam(), supabase.from('clients').select('id, name').order('name')])
  const projects = (data ?? []) as ProjectRow[]

  return (
    <div className="animate-reveal">
      <PageHeader
        title="Projecten"
        description="Aanmaken, opvolgen en afronden. Open een project voor de taken."
        actions={
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
            <ProjectFields clients={clientOptions(clients ?? [])} team={teamOptions(team)} />
          </FormDialog>
        }
      />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <ViewToggle base="/projecten" view={weergave} params={{ wie, klant }} />
        <form className="flex flex-wrap gap-2">
          <input type="hidden" name="weergave" value={weergave} />
          <select name="wie" defaultValue={wie} className="field h-9 w-auto py-0 text-[14px]" aria-label="Verantwoordelijke">
            <option value="">Iedereen</option>
            {team.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name || t.email}
              </option>
            ))}
          </select>
          <select name="klant" defaultValue={klant} className="field h-9 w-auto py-0 text-[14px]" aria-label="Klant">
            <option value="">Alle klanten</option>
            {(clients ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button className="btn btn-secondary btn-sm h-9">Filter</button>
        </form>
      </div>
      {weergave === 'bord' ? (
        <Kanban
          columns={PROJECT_STATUSES}
          onMove={setProjectStatusAction}
          items={projects.map((p) => {
            const owner = team.find((t) => t.id === p.owner_id)
            const done = p.tasks.filter((t) => t.status === 'klaar').length
            return {
              id: p.id,
              status: p.status,
              node: (
                <div>
                  <div className="mb-1 truncate text-[12px] font-semibold text-inkt-zacht">{p.clients?.name ?? 'Intern'}</div>
                  <Link href={`/projecten/${p.id}`} className="block leading-snug font-semibold hover:underline" draggable={false}>
                    {p.title}
                  </Link>
                  <div className="mt-2 flex items-center gap-2 text-[12px] text-inkt-zacht">
                    {p.deadline && <span>{formatDate(p.deadline, true)}</span>}
                    {p.budget != null && <span>· {formatEuro(p.budget)}</span>}
                    {p.tasks.length > 0 && (
                      <span className="tabular">
                        · {done}/{p.tasks.length} taken
                      </span>
                    )}
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
      ) : (
        <ProjectsTable projects={projects} team={team} />
      )}
    </div>
  )
}
