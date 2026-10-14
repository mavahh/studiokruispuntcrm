'use client'

import { useActionState } from 'react'
import { loginAction } from '@/actions/account'
import { FormError, SubmitButton } from '@/components/ui/form'

export function LoginForm() {
  const [state, action] = useActionState(loginAction, {})
  return (
    <form action={action} className="grid gap-4">
      <FormError state={state} />
      <label className="block">
        <span className="label">E-mailadres</span>
        <input className="field" type="email" name="email" autoComplete="email" required />
      </label>
      <label className="block">
        <span className="label">Wachtwoord</span>
        <input className="field" type="password" name="password" autoComplete="current-password" required />
      </label>
      <SubmitButton className="btn btn-primary mt-2 w-full">Inloggen</SubmitButton>
    </form>
  )
}
