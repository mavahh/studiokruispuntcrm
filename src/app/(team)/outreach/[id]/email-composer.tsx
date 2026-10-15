'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { ExternalLink, Send, Sparkles } from 'lucide-react'
import { generateLeadEmailAction } from '@/actions/outreach'
import type { ActionState } from '@/lib/action-state'
import { TEMPLATE_KINDS } from '@/lib/constants'
import { fillTemplate, mailtoLink } from '@/lib/outreach'
import type { EmailTemplate, Lead, TemplateKind } from '@/lib/types'
import { FormError } from '@/components/ui/form'

type Props = {
  lead: Lead
  templates: EmailTemplate[]
  sender: string
  defaultFollowUp: string
  defaultKind: TemplateKind
  canSend: boolean
  aiEnabled: boolean
  send: (prev: ActionState, fd: FormData) => Promise<ActionState>
}

export function EmailComposer({ lead, templates, sender, defaultFollowUp, defaultKind, canSend, aiEnabled, send }: Props) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [kind, setKind] = useState<TemplateKind>(defaultKind)
  const [extra, setExtra] = useState('')
  const [aiError, setAiError] = useState<string | null>(null)
  const [drafting, startDraft] = useTransition()
  const [openedMail, setOpenedMail] = useState(false)
  const [state, action, sending] = useActionState(send, {})

  useEffect(() => {
    if (state.ok) {
      setSubject('')
      setBody('')
      setOpenedMail(false)
    }
  }, [state])

  function applyTemplate(id: string) {
    const t = templates.find((x) => x.id === id)
    if (!t) return
    setSubject(fillTemplate(t.subject, lead, sender))
    setBody(fillTemplate(t.body, lead, sender))
  }

  function draftWithAi() {
    setAiError(null)
    startDraft(async () => {
      const res = await generateLeadEmailAction(lead.id, kind, extra)
      if (res.error) setAiError(res.error)
      else {
        setSubject(res.subject ?? '')
        setBody(res.body ?? '')
      }
    })
  }

  if (lead.do_not_contact) {
    return <p className="rounded-veld bg-rood-soft px-3 py-2 text-[14px] text-rood">Deze lead wil niet meer gecontacteerd worden.</p>
  }

  const hasEmail = !!lead.email
  const busy = drafting || sending

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 rounded-veld bg-papier p-3 sm:grid-cols-[1fr_auto]">
        <label className="block">
          <span className="label">Start van een sjabloon</span>
          <select className="field" defaultValue="" onChange={(e) => applyTemplate(e.target.value)}>
            <option value="" disabled>
              Kies een sjabloon…
            </option>
            {TEMPLATE_KINDS.map((k) => {
              const group = templates.filter((t) => t.kind === k.value)
              return group.length ? (
                <optgroup key={k.value} label={k.label}>
                  {group.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </optgroup>
              ) : null
            })}
          </select>
        </label>
        <div className="hidden items-end pb-2.5 text-[13px] text-inkt-zacht sm:flex">of</div>
        <div className="grid gap-2 sm:col-span-2 sm:grid-cols-[180px_1fr_auto]">
          <label className="block">
            <span className="label">Laat AI schrijven</span>
            <select className="field" value={kind} onChange={(e) => setKind(e.target.value as TemplateKind)}>
              {TEMPLATE_KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Extra instructie (optioneel)</span>
            <input
              className="field"
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              maxLength={500}
              placeholder="Bv. ze openden net een tweede zaak in Geel"
            />
          </label>
          <div className="flex items-end">
            <button type="button" className="btn btn-secondary w-full" onClick={draftWithAi} disabled={!aiEnabled || busy} title={aiEnabled ? undefined : 'ANTHROPIC_API_KEY ontbreekt'}>
              <Sparkles size={16} aria-hidden /> {drafting ? 'Schrijven…' : 'Schrijf mail'}
            </button>
          </div>
        </div>
        {!aiEnabled && <p className="text-[12px] text-inkt-zacht sm:col-span-2">AI staat uit: zet ANTHROPIC_API_KEY in Vercel om mails te laten schrijven.</p>}
        {aiError && (
          <p role="alert" className="text-[13px] text-rood sm:col-span-2">
            {aiError}
          </p>
        )}
      </div>

      <form action={action} className="grid gap-3">
        <FormError state={state} />
        {state.ok && <p className="rounded-veld bg-mint-soft px-3 py-2 text-[14px] text-groen">Gelogd. De opvolging staat ingepland.</p>}
        <label className="block">
          <span className="label">Aan</span>
          <input className="field bg-papier" value={lead.email ?? 'Geen e-mailadres: voeg er een toe via Bewerken'} readOnly />
        </label>
        <label className="block">
          <span className="label">Onderwerp</span>
          <input className="field" name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
        </label>
        <label className="block">
          <span className="label">Bericht</span>
          <textarea className="field resize-y" name="body" rows={12} value={body} onChange={(e) => setBody(e.target.value)} required />
          <span className="mt-1 block text-[12px] text-inkt-zacht">Onderaan komt automatisch een korte afmeldregel.</span>
        </label>
        <label className="block sm:w-56">
          <span className="label">Opvolgen op</span>
          <input className="field" type="date" name="next_follow_up" defaultValue={defaultFollowUp} />
        </label>
        <div className="flex flex-wrap gap-2">
          {canSend && (
            <button name="mode" value="send" className="btn btn-primary" disabled={!hasEmail || busy || !subject || !body}>
              <Send size={16} aria-hidden /> {sending ? 'Versturen…' : 'Versturen'}
            </button>
          )}
          <a
            href={hasEmail && subject && body ? mailtoLink(lead.email!, subject, body) : undefined}
            aria-disabled={!hasEmail || !subject || !body}
            onClick={() => setOpenedMail(true)}
            className={`btn btn-secondary ${!hasEmail || !subject || !body ? 'pointer-events-none opacity-50' : ''}`}
          >
            <ExternalLink size={16} aria-hidden /> Open in mailprogramma
          </a>
          {(openedMail || !canSend) && (
            <button name="mode" value="manual" className="btn btn-ghost" disabled={busy || !subject || !body}>
              Markeer als verstuurd
            </button>
          )}
        </div>
        {!canSend && (
          <p className="text-[12px] text-inkt-zacht">
            Rechtstreeks versturen staat uit (RESEND_API_KEY en OUTREACH_FROM ontbreken). Open de mail in je eigen mailprogramma en markeer ze daarna als
            verstuurd.
          </p>
        )}
      </form>
    </div>
  )
}
