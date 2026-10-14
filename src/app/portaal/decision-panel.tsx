'use client'

import { useActionState } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import type { ActionState } from '@/lib/action-state'
import { FormError } from '@/components/ui/form'

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>

export function DecisionPanel({ approve, requestChanges }: { approve: Action; requestChanges: Action }) {
  const [approveState, approveAction, approving] = useActionState(approve, {})
  const [changesState, changesAction, changing] = useActionState(requestChanges, {})
  const busy = approving || changing
  return (
    <form className="grid gap-3">
      <FormError state={approveState.error ? approveState : changesState} />
      <label>
        <span className="label">Opmerking (verplicht bij aanpassingen)</span>
        <textarea name="body" rows={3} className="field resize-y" placeholder="Bv. tekst op 0:12 aanpassen, muziek iets stiller…" />
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button formAction={approveAction} disabled={busy} className="btn btn-primary flex-1">
          <Check size={17} aria-hidden /> {approving ? 'Bezig…' : 'Goedkeuren'}
        </button>
        <button formAction={changesAction} disabled={busy} className="btn btn-secondary flex-1">
          <RotateCcw size={16} aria-hidden /> {changing ? 'Bezig…' : 'Aanpassingen vragen'}
        </button>
      </div>
    </form>
  )
}
