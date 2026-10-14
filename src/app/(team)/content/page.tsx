import type { Metadata } from 'next'
import { Plus } from 'lucide-react'
import { createContentAction } from '@/actions/content'
import { getTeam } from '@/lib/auth'
import { CONTENT_STATUSES } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui'
import { FormDialog } from '@/components/ui/form'
import { ContentBoard, ContentList, ViewToggle, type ContentRow } from '@/components/content-views'
import { ContentFields, clientOptions, projectOptions, teamOptions } from '@/components/forms'

export const metadata: Metadata = { title: 'Content' }

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ weergave?: string; klant?: string; status?: string; gepost?: string }>
}) {
  const { weergave = 'bord', klant = '', status = '', gepost } = await searchParams
  const supabase = await createClient()
  let query = supabase.from('content_items').select('*, clients(name), content_comments(count)').order('planned_date', { ascending: true, nullsFirst: false })
  if (klant) query = query.eq('client_id', klant)
  if (status) query = query.eq('status', status)
  // Geposte content verbergen we standaard (behalve als je erop filtert).
  else if (!gepost) query = query.neq('status', 'gepost')
  const [{ data }, team, { data: clients }, { data: projects }] = await Promise.all([
    query,
    getTeam(),
    supabase.from('clients').select('id, name').order('name'),
    supabase.from('projects').select('id, title').neq('status', 'afgerond').order('title'),
  ])
  const items = (data ?? []) as ContentRow[]

  return (
    <div className="animate-reveal">
      <PageHeader
        title="Content"
        description="Alle posts en video's: van idee tot gepost."
        actions={
          <FormDialog
            title="Nieuwe content"
            trigger={
              <>
                <Plus size={17} aria-hidden /> Nieuwe content
              </>
            }
            action={createContentAction}
            wide
          >
            <ContentFields clients={clientOptions(clients ?? [])} projects={projectOptions(projects ?? [])} team={teamOptions(team)} clientId={undefined} />
          </FormDialog>
        }
      />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <ViewToggle base="/content" view={weergave} params={{ klant, status, gepost }} />
        <form className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="weergave" value={weergave} />
          <select name="klant" defaultValue={klant} className="field h-9 w-auto py-0 text-[14px]" aria-label="Klant">
            <option value="">Alle klanten</option>
            {(clients ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={status} className="field h-9 w-auto py-0 text-[14px]" aria-label="Status">
            <option value="">Alle statussen</option>
            {CONTENT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-[13px] text-inkt-zacht">
            <input type="checkbox" name="gepost" value="1" defaultChecked={!!gepost} /> Toon gepost
          </label>
          <button className="btn btn-secondary btn-sm h-9">Filter</button>
        </form>
      </div>
      {weergave === 'lijst' ? <ContentList items={items} team={team} /> : <ContentBoard items={items} team={team} />}
    </div>
  )
}
