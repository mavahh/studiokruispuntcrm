import Link from 'next/link'
import { PROJECT_STATUSES, optionFor } from '@/lib/constants'
import { formatDate, formatEuro, relativeDays, todayISO } from '@/lib/format'
import type { Profile, Project } from '@/lib/types'
import { Avatar, Badge, EmptyState, Table } from '@/components/ui'

export type ProjectRow = Project & { clients: { name: string } | null; tasks: { status: string }[] }

export function ProjectsTable({ projects, team, showClient = true }: { projects: ProjectRow[]; team: Profile[]; showClient?: boolean }) {
  const today = todayISO()
  if (projects.length === 0) return <EmptyState title="Geen projecten">Maak een project aan om taken, budget en deadline op te volgen.</EmptyState>
  return (
    <div className="card overflow-hidden">
      <Table>
        <thead>
          <tr>
            <th>Project</th>
            <th>Status</th>
            <th className="hidden md:table-cell">Voortgang</th>
            <th className="hidden sm:table-cell">Deadline</th>
            <th className="hidden lg:table-cell text-right">Budget</th>
            <th className="hidden md:table-cell">Wie</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => {
            const s = optionFor(PROJECT_STATUSES, p.status)
            const total = p.tasks.length
            const done = p.tasks.filter((t) => t.status === 'klaar').length
            const owner = team.find((t) => t.id === p.owner_id)
            const late = p.deadline && p.deadline < today && p.status !== 'afgerond'
            return (
              <tr key={p.id} className="hover:bg-papier">
                <td>
                  <Link href={`/projecten/${p.id}`} className="font-semibold text-nacht hover:underline">
                    {p.title}
                  </Link>
                  {showClient && <div className="text-[13px] text-inkt-zacht">{p.clients?.name ?? 'Intern'}</div>}
                </td>
                <td>
                  <Badge tone={s.tone}>{s.label}</Badge>
                </td>
                <td className="hidden md:table-cell">
                  {total > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-hemel-soft">
                        <div className="h-full rounded-full bg-mint" style={{ width: `${(done / total) * 100}%` }} />
                      </div>
                      <span className="tabular text-[13px] text-inkt-zacht">
                        {done}/{total}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[13px] text-inkt-zacht">Geen taken</span>
                  )}
                </td>
                <td className="hidden sm:table-cell">
                  {p.deadline ? (
                    <>
                      <div className={`tabular ${late ? 'font-semibold text-rood' : ''}`}>{formatDate(p.deadline, true)}</div>
                      {p.status !== 'afgerond' && <div className="text-[12px] text-inkt-zacht">{relativeDays(p.deadline)}</div>}
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="tabular hidden text-right lg:table-cell">{formatEuro(p.budget)}</td>
                <td className="hidden md:table-cell">{owner ? <Avatar name={owner.full_name || owner.email} size={26} /> : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </Table>
    </div>
  )
}
