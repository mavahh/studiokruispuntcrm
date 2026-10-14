'use client'

import { useOptimistic, useState, useTransition } from 'react'
import type { Tone } from '@/lib/constants'

type Column = { value: string; label: string; tone: Tone }
type Item = { id: string; status: string; node: React.ReactNode }

const dot: Record<Tone, string> = {
  neutral: 'bg-hemel',
  blue: 'bg-blauw',
  mint: 'bg-mint',
  signal: 'bg-signaal',
  muted: 'bg-lijn',
  danger: 'bg-rood',
}

/**
 * Kanbanbord: slepen tussen kolommen (muis) en een statuskeuze op elke kaart (touch/toetsenbord).
 * De wijziging verschijnt meteen; de server-actie bevestigt op de achtergrond.
 */
export function Kanban({
  columns,
  items,
  onMove,
  emptyLabel = 'Sleep hier iets naartoe',
}: {
  columns: Column[]
  items: Item[]
  onMove: (id: string, status: string) => Promise<unknown>
  emptyLabel?: string
}) {
  const [optimistic, setOptimistic] = useOptimistic(items, (state, move: { id: string; status: string }) =>
    state.map((i) => (i.id === move.id ? { ...i, status: move.status } : i)),
  )
  const [, start] = useTransition()
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)

  function move(id: string, status: string) {
    const current = optimistic.find((i) => i.id === id)
    if (!current || current.status === status) return
    start(async () => {
      setOptimistic({ id, status })
      await onMove(id, status)
    })
  }

  return (
    <div className="relative -mx-4 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
      <div className="flex min-w-max gap-3">
        {columns.map((col) => {
          const colItems = optimistic.filter((i) => i.status === col.value)
          return (
            <section
              key={col.value}
              aria-label={col.label}
              onDragOver={(e) => {
                e.preventDefault()
                setOver(col.value)
              }}
              onDragLeave={() => setOver((o) => (o === col.value ? null : o))}
              onDrop={(e) => {
                e.preventDefault()
                const id = e.dataTransfer.getData('text/plain')
                setOver(null)
                setDragging(null)
                if (id) move(id, col.value)
              }}
              className={`flex w-[272px] shrink-0 flex-col rounded-kaart border p-2 transition-colors duration-150 ${
                over === col.value && dragging ? 'border-blauw bg-hemel-soft' : 'border-transparent bg-hemel-soft/60'
              }`}
            >
              <header className="flex items-center gap-2 px-2 pt-1 pb-2.5">
                <span className={`h-2.5 w-2.5 rounded-full ${dot[col.tone]}`} aria-hidden />
                <h3 className="font-sans text-[13px] font-bold tracking-[0.04em] text-nacht uppercase">{col.label}</h3>
                <span className="tabular ml-auto text-[12px] font-semibold text-inkt-zacht">{colItems.length}</span>
              </header>
              <ul className="grid min-h-16 gap-2">
                {colItems.map((item) => (
                  <li
                    key={item.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', item.id)
                      e.dataTransfer.effectAllowed = 'move'
                      setDragging(item.id)
                    }}
                    onDragEnd={() => {
                      setDragging(null)
                      setOver(null)
                    }}
                    className={`group rounded-veld border border-lijn bg-white p-3 shadow-[0_1px_2px_rgb(27_44_94/0.06)] transition-opacity duration-150 ${
                      dragging === item.id ? 'opacity-40' : ''
                    } cursor-grab active:cursor-grabbing`}
                  >
                    {item.node}
                    <label className="mt-2 block">
                      <span className="sr-only">Status wijzigen</span>
                      <select
                        className="field h-7 py-0 text-[12px]"
                        value={item.status}
                        onChange={(e) => move(item.id, e.target.value)}
                      >
                        {columns.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </li>
                ))}
                {colItems.length === 0 && (
                  <li className="rounded-veld border border-dashed border-lijn px-3 py-4 text-center text-[12px] text-inkt-zacht">{emptyLabel}</li>
                )}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
