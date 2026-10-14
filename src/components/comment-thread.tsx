import { formatDateTime } from '@/lib/format'
import type { ActionState } from '@/lib/action-state'
import { Avatar } from './ui'
import { ActionForm, SubmitButton } from './ui/form'

export type CommentRow = {
  id: string
  body: string
  created_at: string
  author_id: string | null
  profiles: { full_name: string | null; email: string; role: string } | null
}

export function CommentThread({
  comments,
  viewerId,
  action,
  placeholder = 'Schrijf een bericht…',
  submitLabel = 'Versturen',
}: {
  comments: CommentRow[]
  viewerId: string
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>
  placeholder?: string
  submitLabel?: string
}) {
  return (
    <div>
      {comments.length === 0 ? (
        <p className="mb-4 text-[14px] text-inkt-zacht">Nog geen berichten.</p>
      ) : (
        <ol className="mb-5 grid gap-4">
          {comments.map((c) => {
            const mine = c.author_id === viewerId
            const isTeam = c.profiles?.role === 'team'
            const name = c.profiles?.full_name || c.profiles?.email || 'Onbekend'
            return (
              <li key={c.id} className={`flex gap-3 ${mine ? 'flex-row-reverse' : ''}`}>
                <Avatar name={name} size={30} />
                <div className={`max-w-[85%] ${mine ? 'text-right' : ''}`}>
                  <div className="mb-1 text-[12px] text-inkt-zacht">
                    <span className="font-semibold text-nacht">{name}</span>
                    {isTeam ? ' · Studio Kruispunt' : ''} · {formatDateTime(c.created_at)}
                  </div>
                  <div
                    className={`inline-block rounded-kaart px-3.5 py-2.5 text-left whitespace-pre-line ${
                      mine ? 'bg-nacht text-white' : isTeam ? 'bg-hemel-soft' : 'border border-lijn bg-white'
                    }`}
                  >
                    {c.body}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}
      <ActionForm action={action} resetOnSuccess className="grid gap-2">
        <label>
          <span className="sr-only">Bericht</span>
          <textarea name="body" required rows={3} className="field resize-y" placeholder={placeholder} />
        </label>
        <div className="flex justify-end">
          <SubmitButton className="btn btn-primary btn-sm">{submitLabel}</SubmitButton>
        </div>
      </ActionForm>
    </div>
  )
}
