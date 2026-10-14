import { changePasswordAction } from '@/actions/account'
import { ActionForm, SubmitButton } from './ui/form'
import { TextField } from './ui/fields'

export function PasswordForm() {
  return (
    <ActionForm action={changePasswordAction} resetOnSuccess className="grid max-w-sm gap-4">
      <TextField label="Nieuw wachtwoord" name="password" type="password" required hint="Minstens 10 tekens." />
      <TextField label="Herhaal wachtwoord" name="password_repeat" type="password" required />
      <div>
        <SubmitButton>Wachtwoord wijzigen</SubmitButton>
      </div>
    </ActionForm>
  )
}
