import type { Metadata } from 'next'
import { getTeam, requireTeam } from '@/lib/auth'
import { Avatar, Card, PageHeader } from '@/components/ui'
import { PasswordForm } from '@/components/password-form'

export const metadata: Metadata = { title: 'Account' }

export default async function AccountPage() {
  const profile = await requireTeam()
  const team = await getTeam()
  return (
    <div className="animate-reveal">
      <PageHeader title="Account" description={profile.email} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Wachtwoord wijzigen">
          <PasswordForm />
        </Card>
        <Card title="Team">
          <ul className="grid gap-3">
            {team.map((t) => (
              <li key={t.id} className="flex items-center gap-3">
                <Avatar name={t.full_name || t.email} size={32} />
                <div>
                  <div className="font-semibold">{t.full_name || t.email}</div>
                  <div className="text-[13px] text-inkt-zacht">{t.email}</div>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[13px] text-inkt-zacht">Teamleden toevoegen gaat via het script in de README (npm run teamlid).</p>
        </Card>
      </div>
    </div>
  )
}
