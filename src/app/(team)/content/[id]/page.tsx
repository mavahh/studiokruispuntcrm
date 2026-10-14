import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink, Pencil, PlayCircle } from 'lucide-react'
import { deleteContentAction, setContentStatusAction, teamCommentAction, updateContentAction } from '@/actions/content'
import { getTeam, requireTeam } from '@/lib/auth'
import { CONTENT_STATUSES, CONTENT_TYPES } from '@/lib/constants'
import { formatDate, formatDateTime } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import type { ContentItem } from '@/lib/types'
import { Avatar, Card, PageHeader } from '@/components/ui'
import { AutoSelect, ConfirmButton, FormDialog } from '@/components/ui/form'
import { ContentFields, clientOptions, projectOptions, teamOptions } from '@/components/forms'
import { CommentThread, type CommentRow } from '@/components/comment-thread'
import { StatusTrack } from '@/components/status-track'

type Params = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('content_items').select('title').eq('id', id).single()
  return { title: data?.title ?? 'Content' }
}

export default async function ContentDetailPage({ params }: Params) {
  const { id } = await params
  const profile = await requireTeam()
  const supabase = await createClient()
  const [{ data: item }, team, { data: comments }, { data: clients }, { data: projects }] = await Promise.all([
    supabase
      .from('content_items')
      .select('*, clients(id, name), projects(id, title)')
      .eq('id', id)
      .single<ContentItem & { clients: { id: string; name: string } | null; projects: { id: string; title: string } | null }>(),
    getTeam(),
    supabase.from('content_comments').select('id, body, created_at, author_id, profiles(full_name, email, role)').eq('content_item_id', id).order('created_at'),
    supabase.from('clients').select('id, name').order('name'),
    supabase.from('projects').select('id, title').order('title'),
  ])
  if (!item) notFound()
  const assignee = team.find((t) => t.id === item.assignee_id)
  const back = item.clients ? `/klanten/${item.clients.id}?tab=content` : '/content'

  return (
    <div className="animate-reveal">
      <PageHeader
        eyebrow={
          <Link href={back} className="hover:text-nacht">
            ← {item.clients?.name ?? 'Content'}
          </Link>
        }
        title={item.title}
        description={`${CONTENT_TYPES.find((t) => t.value === item.type)?.label} · ${item.platforms.join(', ') || 'geen platform gekozen'}`}
        actions={
          <>
            <AutoSelect
              label="Status"
              name="status"
              defaultValue={item.status}
              options={CONTENT_STATUSES}
              action={setContentStatusAction.bind(null, id)}
              className="field h-10 w-auto py-0 font-semibold"
            />
            <FormDialog
              title="Content bewerken"
              trigger={
                <>
                  <Pencil size={16} aria-hidden /> Bewerken
                </>
              }
              triggerClassName="btn btn-secondary"
              action={updateContentAction.bind(null, id)}
              wide
            >
              <ContentFields item={item} clients={clientOptions(clients ?? [])} projects={projectOptions(projects ?? [])} team={teamOptions(team)} />
            </FormDialog>
          </>
        }
      />

      <div className="mb-6">
        <StatusTrack status={item.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="grid content-start gap-6">
          {item.drive_url ? (
            <a
              href={item.drive_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 rounded-kaart bg-blauw p-5 text-white transition-transform duration-150 active:scale-[0.99]"
            >
              <PlayCircle size={40} className="shrink-0 text-mint" aria-hidden />
              <div className="min-w-0">
                <div className="font-display text-[18px] font-bold">Bekijken in Google Drive</div>
                <div className="truncate text-[13px] text-white/70">{item.drive_url}</div>
              </div>
              <ExternalLink size={18} className="ml-auto shrink-0 text-white/70" aria-hidden />
            </a>
          ) : (
            <div className="rounded-kaart border border-dashed border-lijn bg-white p-5 text-inkt-zacht">
              Nog geen Drive-link. Voeg er een toe via <strong>Bewerken</strong> zodat de klant kan meekijken.
            </div>
          )}

          {item.caption && (
            <Card title="Caption">
              <p className="whitespace-pre-line">{item.caption}</p>
            </Card>
          )}

          <Card title="Feedback & berichten">
            <CommentThread
              comments={(comments ?? []) as unknown as CommentRow[]}
              viewerId={profile.id}
              action={teamCommentAction.bind(null, id)}
              placeholder="Bericht aan de klant (die krijgt een melding)…"
            />
          </Card>
        </div>

        <Card title="Details">
          <dl className="grid gap-3 text-[14px]">
            <div>
              <dt className="text-[12px] font-semibold text-inkt-zacht">Klant</dt>
              <dd>
                {item.clients ? (
                  <Link className="link" href={`/klanten/${item.clients.id}`}>
                    {item.clients.name}
                  </Link>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[12px] font-semibold text-inkt-zacht">Plandatum</dt>
              <dd>{formatDate(item.planned_date)}</dd>
            </div>
            <div>
              <dt className="text-[12px] font-semibold text-inkt-zacht">Verantwoordelijke</dt>
              <dd className="flex items-center gap-2">
                {assignee ? (
                  <>
                    <Avatar name={assignee.full_name || assignee.email} size={22} /> {assignee.full_name || assignee.email}
                  </>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[12px] font-semibold text-inkt-zacht">Project</dt>
              <dd>
                {item.projects ? (
                  <Link className="link" href={`/projecten/${item.projects.id}`}>
                    {item.projects.title}
                  </Link>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            {item.posted_url && (
              <div>
                <dt className="text-[12px] font-semibold text-inkt-zacht">Gepubliceerd</dt>
                <dd>
                  <a className="link" href={item.posted_url} target="_blank" rel="noopener noreferrer">
                    Bekijk post
                  </a>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-[12px] font-semibold text-inkt-zacht">Laatst gewijzigd</dt>
              <dd>{formatDateTime(item.updated_at)}</dd>
            </div>
          </dl>
          <div className="mt-6 border-t border-lijn pt-4">
            <ConfirmButton action={deleteContentAction.bind(null, id, back)} confirm={`"${item.title}" verwijderen?`}>
              Verwijderen
            </ConfirmButton>
          </div>
        </Card>
      </div>
    </div>
  )
}
