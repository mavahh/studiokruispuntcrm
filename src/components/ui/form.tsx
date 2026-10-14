'use client'

import { useActionState, useEffect, useId, useRef, useTransition } from 'react'
import { useFormStatus } from 'react-dom'
import { X } from 'lucide-react'
import type { ActionState } from '@/lib/action-state'

export function SubmitButton({ children, className = 'btn btn-primary' }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? 'Bezig…' : children}
    </button>
  )
}

export function FormError({ state }: { state: ActionState }) {
  if (!state.error) return null
  return (
    <p role="alert" className="rounded-veld bg-rood-soft px-3 py-2 text-[14px] text-rood">
      {state.error}
    </p>
  )
}

type DialogProps = {
  trigger: React.ReactNode
  triggerClassName?: string
  title: string
  description?: string
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>
  submitLabel?: string
  children: React.ReactNode
  wide?: boolean
}

/** Knop die een modaal formulier opent; sluit zichzelf na een geslaagde actie. */
export function FormDialog({ trigger, triggerClassName = 'btn btn-primary', title, description, action, submitLabel = 'Opslaan', children, wide }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const titleId = useId()
  const [state, formAction] = useActionState(action, {})

  useEffect(() => {
    if (state.ok) {
      ref.current?.close()
      formRef.current?.reset()
    }
  }, [state])

  return (
    <>
      <button type="button" className={triggerClassName} onClick={() => ref.current?.showModal()}>
        {trigger}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        className={`m-auto w-[calc(100%-32px)] ${wide ? 'max-w-2xl' : 'max-w-lg'} rounded-kaart bg-white p-0 text-inkt shadow-2xl backdrop:bg-nacht/40 open:animate-pop`}
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close()
        }}
      >
        <form ref={formRef} action={formAction} className="flex max-h-[85dvh] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-lijn px-5 py-4">
            <div>
              <h2 id={titleId} className="text-[19px] font-semibold">
                {title}
              </h2>
              {description && <p className="mt-0.5 text-[14px] text-inkt-zacht">{description}</p>}
            </div>
            <button type="button" className="btn btn-ghost btn-icon -mr-2" aria-label="Sluiten" onClick={() => ref.current?.close()}>
              <X size={18} />
            </button>
          </header>
          <div className="grid gap-4 overflow-y-auto px-5 py-5">
            <FormError state={state} />
            {children}
          </div>
          <footer className="flex justify-end gap-2 border-t border-lijn px-5 py-3.5">
            <button type="button" className="btn btn-secondary" onClick={() => ref.current?.close()}>
              Annuleren
            </button>
            <SubmitButton>{submitLabel}</SubmitButton>
          </footer>
        </form>
      </dialog>
    </>
  )
}

/** Inline formulier (zonder modaal) met foutmelding. */
export function ActionForm({
  action,
  children,
  className = '',
  resetOnSuccess = false,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>
  children: React.ReactNode
  className?: string
  resetOnSuccess?: boolean
}) {
  const [state, formAction] = useActionState(action, {})
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset()
  }, [state, resetOnSuccess])
  return (
    <form ref={ref} action={formAction} className={className}>
      <FormError state={state} />
      {children}
    </form>
  )
}

/** Knop die eerst om bevestiging vraagt (verwijderen e.d.). */
export function ConfirmButton({
  action,
  confirm,
  children,
  className = 'btn btn-danger btn-sm',
}: {
  action: () => Promise<unknown>
  confirm: string
  children: React.ReactNode
  className?: string
}) {
  const [pending, start] = useTransition()
  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      onClick={() => {
        if (window.confirm(confirm)) start(async () => void (await action()))
      }}
    >
      {pending ? 'Bezig…' : children}
    </button>
  )
}

/** Select die meteen opslaat bij wijziging (status, toegewezen persoon…). */
export function AutoSelect({
  action,
  name,
  defaultValue,
  options,
  className = 'field h-8 w-auto py-0 text-[13px]',
  label,
}: {
  action: (value: string) => Promise<unknown>
  name: string
  defaultValue: string
  options: { value: string; label: string }[]
  className?: string
  label: string
}) {
  const [pending, start] = useTransition()
  return (
    <select
      name={name}
      aria-label={label}
      defaultValue={defaultValue}
      disabled={pending}
      className={className}
      onChange={(e) => {
        const value = e.target.value
        start(async () => void (await action(value)))
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
