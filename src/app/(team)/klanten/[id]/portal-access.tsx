import { KeyRound, UserPlus } from 'lucide-react'
import { createPortalLoginAction, removePortalLoginAction, resetPortalPasswordAction } from '@/actions/clients'
import { formatDate } from '@/lib/format'
import type { Profile } from '@/lib/types'
import { Avatar, Card, EmptyState } from '@/components/ui'
import { ConfirmButton, FormDialog } from '@/components/ui/form'
import { TextField } from '@/components/ui/fields'

export function PortalAccess({ clientId, clientName, logins }: { clientId: string; clientName: string; logins: (Profile & { created_at: string })[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <Card
        title="Portaal-logins"
        actions={
          <FormDialog
            title="Portaal-login aanmaken"
            description={`${clientName} kan hiermee inloggen, content bekijken en feedback geven.`}
            trigger={
              <>
                <UserPlus size={15} aria-hidden /> Login aanmaken
              </>
            }
            triggerClassName="btn btn-primary btn-sm"
            action={createPortalLoginAction.bind(null, clientId)}
            submitLabel="Aanmaken"
          >
            <TextField label="Naam" name="full_name" placeholder="Voornaam Achternaam" />
            <TextField label="E-mailadres" name="email" type="email" required />
            <TextField
              label="Wachtwoord"
              name="password"
              type="text"
              required
              hint="Minstens 10 tekens. Bezorg het zelf aan de klant; die kan het daarna wijzigen."
            />
          </FormDialog>
        }
        padded={false}
      >
        {logins.length === 0 ? (
          <div className="p-5">
            <EmptyState title="Nog geen toegang">Maak een login aan zodat de klant content kan bekijken en goedkeuren.</EmptyState>
          </div>
        ) : (
          <ul>
            {logins.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3 border-t border-lijn px-5 py-3.5 first:border-t-0">
                <Avatar name={l.full_name || l.email} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{l.full_name || l.email}</div>
                  <div className="truncate text-[13px] text-inkt-zacht">
                    {l.email} · sinds {formatDate(l.created_at)}
                  </div>
                </div>
                <FormDialog
                  title="Nieuw wachtwoord"
                  description={l.email}
                  trigger={
                    <>
                      <KeyRound size={14} aria-hidden /> Wachtwoord
                    </>
                  }
                  triggerClassName="btn btn-secondary btn-sm"
                  action={resetPortalPasswordAction.bind(null, l.id, clientId)}
                >
                  <TextField label="Nieuw wachtwoord" name="password" type="text" required hint="Minstens 10 tekens." />
                </FormDialog>
                <ConfirmButton action={removePortalLoginAction.bind(null, l.id, clientId)} confirm={`Toegang van ${l.email} intrekken?`}>
                  Intrekken
                </ConfirmButton>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Wat ziet de klant?">
        <ul className="grid list-disc gap-2 pl-5 text-[14px] text-inkt-zacht">
          <li>Alle content van {clientName}, met status en plandatum.</li>
          <li>De Google Drive-link om video&apos;s en posts te bekijken.</li>
          <li>Een feedbackgesprek per post of video.</li>
          <li>Goedkeuren of aanpassingen vragen zodra iets op &quot;Feedback klant&quot; staat.</li>
          <li>Geen bedragen, contracten, projecten of andere klanten.</li>
        </ul>
        <p className="mt-4 text-[14px]">
          De klant logt in op <strong>crm.studiokruispunt.be</strong>.
        </p>
      </Card>
    </div>
  )
}
