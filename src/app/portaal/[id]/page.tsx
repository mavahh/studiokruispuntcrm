import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink, PlayCircle } from 'lucide-react'
import { clientCommentAction, clientDecisionAction } from '@/actions/content'
import { requireClient } from '@/lib/auth'
import { CONTENT_TYPES } from '@/lib/constants'
import { formatDate } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import type { ContentItem } from '@/lib/types'
import { Card, PageHeader } from '@/components/ui'
import { CommentThread, type CommentRow } from '@/components/comment-thread'
import { StatusTrack } from '@/components/status-track'
import { DecisionPanel } from '../decision-panel'

type Params = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('content_items').select('title').eq('id', id).single()
  return { title: data?.title ?? 'Content' }
}

export default async function PortalItemPage({ params }: Params) {
  const { id } = await params
  const profile = await requireClient()
  const supabase = await createClient()
  const [{ data: item }, { data: comments }] = await Promise.all([
    supabase.from('content_items').select('*').eq('id', id).eq('client_id', profile.client_id).single<ContentItem>(),
    supabase.from('content_comments').select('id, body, created_at, author_id, profiles(full_name, email, role)').eq('content_item_id', id).order('created_at'),
  ])
  if (!item) notFound()

  return (
    <div className="animate-reveal">
      <PageHeader
        eyebrow={
          <Link href="/portaal" className="hover:text-nacht">
            ← Alle content
          </Link>
        }
        title={item.title}
        description={[
          CONTENT_TYPES.find((t) => t.value === item.type)?.label,
          item.platforms.join(', '),
          item.planned_date ? `gepland op ${formatDate(item.planned_date)}` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      />
      <div className="mb-6">
        <StatusTrack status={item.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="grid content-start gap-6">
          {item.drive_url ? (
            <a
              href={item.drive_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-kaart bg-blauw p-5 text-white transition-transform duration-150 active:scale-[0.99]"
            >
              <PlayCircle size={44} className="shrink-0 text-mint" aria-hidden />
              <div>
                <div className="font-display text-[19px] font-bold">Bekijk de {item.type === 'post' || item.type === 'carrousel' ? 'post' : 'video'}</div>
                <div className="text-[14px] text-white/75">Opent in Google Drive</div>
              </div>
              <ExternalLink size={18} className="ml-auto shrink-0 text-white/70" aria-hidden />
            </a>
          ) : (
            <div className="rounded-kaart border border-dashed border-lijn bg-white p-5 text-inkt-zacht">De beelden worden nog gemaakt. Je krijgt een melding zodra je kan meekijken.</div>
          )}
          {item.caption && (
            <Card title="Caption">
              <p className="whitespace-pre-line">{item.caption}</p>
            </Card>
          )}
          {item.posted_url && (
            <a href={item.posted_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary self-start">
              <ExternalLink size={16} aria-hidden /> Bekijk de post online
            </a>
          )}
          <Card title="Berichten">
            <CommentThread
              comments={(comments ?? []) as unknown as CommentRow[]}
              viewerId={profile.id}
              action={clientCommentAction.bind(null, id)}
              placeholder="Vraag of opmerking voor Studio Kruispunt…"
            />
          </Card>
        </div>

        <div className="order-first grid content-start gap-6 lg:order-none">
          {item.status === 'feedback' ? (
            <section className="rounded-kaart border-2 border-signaal/50 bg-white p-5">
              <h2 className="text-[19px] font-semibold">Klaar voor jouw feedback</h2>
              <p className="mt-1 mb-4 text-[14px] text-inkt-zacht">Bekijk de beelden en laat weten of het goed is.</p>
              <DecisionPanel approve={clientDecisionAction.bind(null, id, 'goedkeuren')} requestChanges={clientDecisionAction.bind(null, id, 'aanpassen')} />
            </section>
          ) : (
            <Card title="Status">
              <p className="text-[14px] text-inkt-zacht">
                {item.status === 'goedgekeurd' && 'Je keurde dit goed. We plannen het in.'}
                {item.status === 'ingepland' && `Staat ingepland${item.planned_date ? ` voor ${formatDate(item.planned_date)}` : ''}.`}
                {item.status === 'gepost' && 'Dit staat online.'}
                {['idee', 'script', 'opname', 'montage'].includes(item.status) && 'We werken hieraan. Je krijgt een melding zodra je kan meekijken.'}
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
