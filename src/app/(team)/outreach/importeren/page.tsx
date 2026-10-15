import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/ui'
import { CsvImport } from './csv-import'

export const metadata: Metadata = { title: 'Leads importeren' }

export default function ImportPage() {
  return (
    <div className="animate-reveal">
      <PageHeader
        eyebrow={
          <Link href="/outreach" className="hover:text-nacht">
            ← Outreach
          </Link>
        }
        title="Leads importeren"
        description="Een lijst zaken uit Excel of Google Sheets in één keer toevoegen."
      />
      <CsvImport />
    </div>
  )
}
