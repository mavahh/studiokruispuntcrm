import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createTemplateAction, deleteTemplateAction, updateTemplateAction } from '@/actions/outreach'
import { TEMPLATE_KINDS } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'
import type { EmailTemplate } from '@/lib/types'
import { Badge, EmptyState, PageHeader } from '@/components/ui'
import { ConfirmButton, FormDialog } from '@/components/ui/form'
import { TemplateFields } from '@/components/forms'

export const metadata: Metadata = { title: 'E-mailsjablonen' }

export default async function TemplatesPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('email_templates').select('*').order('created_at')
  const templates = (data ?? []) as EmailTemplate[]

  return (
    <div className="animate-reveal">
      <PageHeader
        eyebrow={
          <Link href="/outreach" className="hover:text-nacht">
            ← Outreach
          </Link>
        }
        title="E-mailsjablonen"
        description="Vaste teksten voor eerste contact, opvolging en na een gesprek. Invulvelden worden per lead ingevuld."
        actions={
          <FormDialog
            title="Nieuw sjabloon"
            trigger={
              <>
                <Plus size={17} aria-hidden /> Nieuw sjabloon
              </>
            }
            action={createTemplateAction}
            wide
          >
            <TemplateFields />
          </FormDialog>
        }
      />
      <p className="mb-6 rounded-veld bg-hemel-soft px-4 py-3 text-[14px]">
        Invulvelden: <code>{'{voornaam}'}</code>, <code>{'{contact}'}</code>, <code>{'{zaak}'}</code>, <code>{'{gemeente}'}</code>, <code>{'{sector}'}</code>,{' '}
        <code>{'{afzender}'}</code>
      </p>
      {templates.length === 0 ? (
        <EmptyState title="Nog geen sjablonen" />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {templates.map((t) => (
            <li key={t.id} className="card flex flex-col p-5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-[17px] font-semibold">{t.name}</h2>
                <Badge tone="neutral">{TEMPLATE_KINDS.find((k) => k.value === t.kind)?.label}</Badge>
              </div>
              <div className="text-[14px] font-semibold">{t.subject}</div>
              <p className="mt-2 line-clamp-6 flex-1 text-[14px] whitespace-pre-line text-inkt-zacht">{t.body}</p>
              <div className="mt-4 flex gap-2">
                <FormDialog title="Sjabloon bewerken" trigger="Bewerken" triggerClassName="btn btn-secondary btn-sm" action={updateTemplateAction.bind(null, t.id)} wide>
                  <TemplateFields template={t} />
                </FormDialog>
                <ConfirmButton action={deleteTemplateAction.bind(null, t.id)} confirm={`Sjabloon "${t.name}" verwijderen?`} className="btn btn-ghost btn-sm text-rood">
                  Verwijderen
                </ConfirmButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
