import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth'
import { Card, PageHeader } from '@/components/ui'
import { PasswordForm } from '@/components/password-form'

export const metadata: Metadata = { title: 'Account' }

export default async function PortalAccountPage() {
  const profile = await requireClient()
  return (
    <div className="animate-reveal">
      <PageHeader title="Account" description={profile.email} />
      <Card title="Wachtwoord wijzigen">
        <PasswordForm />
      </Card>
    </div>
  )
}
