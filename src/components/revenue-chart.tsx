'use client'

import { useState } from 'react'
import { formatEuro } from '@/lib/format'

type Bar = { label: string; retainers: number; quotes: number; expenses: number; profit: number }

// Gevalideerd palet (CVD-veilig, ≥3:1 op wit): retainers blauw, offertes groen.
const SERIES = [
  { key: 'retainers', label: 'Retainers', color: '#4A67B8' },
  { key: 'quotes', label: 'Offertes', color: '#00A57A' },
] as const

function niceMax(v: number) {
  if (v <= 0) return 1000
  const pow = 10 ** Math.floor(Math.log10(v))
  const steps = [1, 2, 2.5, 5, 10]
  for (const s of steps) if (s * pow >= v) return s * pow
  return 10 * pow
}

function compact(v: number) {
  return v >= 1000 ? `€${(v / 1000).toLocaleString('nl-BE', { maximumFractionDigits: 1 })}K` : `€${v}`
}

/** Gestapelde kolommen: omzet per periode, opgesplitst in retainers en offertes. */
export function RevenueChart({ bars, title }: { bars: Bar[]; title: string }) {
  const [active, setActive] = useState<number | null>(null)
  const max = niceMax(Math.max(...bars.map((b) => b.retainers + b.quotes)))
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max)
  const H = 200

  return (
    <figure>
      <figcaption className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span className="font-display text-[17px] font-semibold text-nacht">{title}</span>
        <span className="flex gap-4 text-[13px] text-inkt-zacht">
          {SERIES.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: s.color }} aria-hidden />
              {s.label}
            </span>
          ))}
        </span>
      </figcaption>
      <div className="relative flex gap-3">
        <div className="tabular relative w-12 shrink-0 text-right text-[12px] text-inkt-zacht" style={{ height: H }} aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0" style={{ bottom: `${(t / max) * H}px`, transform: 'translateY(50%)' }}>
              {compact(t)}
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          <div className="relative flex items-end justify-around" style={{ height: H }}>
            {ticks.map((t) => (
              <div key={t} className="absolute inset-x-0 h-px bg-lijn" style={{ bottom: `${(t / max) * H}px` }} aria-hidden />
            ))}
            {bars.map((b, i) => {
              const total = b.retainers + b.quotes
              const rH = (b.retainers / max) * H
              const qH = (b.quotes / max) * H
              return (
                <button
                  key={b.label}
                  type="button"
                  className="relative flex h-full w-full cursor-default flex-col items-center justify-end outline-none"
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  aria-label={`${b.label}: omzet ${formatEuro(total)}, retainers ${formatEuro(b.retainers)}, offertes ${formatEuro(b.quotes)}, kosten ${formatEuro(b.expenses)}, winst ${formatEuro(b.profit)}`}
                >
                  {total > 0 && (
                    <span className="tabular mb-1 text-[12px] font-semibold text-nacht" aria-hidden>
                      {compact(Math.round(total))}
                    </span>
                  )}
                  <span className={`flex w-6 flex-col gap-[2px] transition-opacity duration-150 ${active != null && active !== i ? 'opacity-50' : ''}`} aria-hidden>
                    {qH > 0 && <span className="block w-full rounded-t-[4px]" style={{ height: qH, background: SERIES[1].color }} />}
                    {rH > 0 && <span className={`block w-full ${qH > 0 ? '' : 'rounded-t-[4px]'}`} style={{ height: rH, background: SERIES[0].color }} />}
                  </span>
                  {active === i && (
                    <span className="pointer-events-none absolute bottom-full z-10 mb-2 w-48 animate-pop rounded-veld bg-nacht p-3 text-left text-[12px] text-white shadow-lg">
                      <span className="mb-1.5 block font-semibold">{b.label}</span>
                      {SERIES.map((s) => (
                        <span key={s.key} className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-[2px]" style={{ background: s.color }} />
                            {s.label}
                          </span>
                          <span className="tabular">{formatEuro(b[s.key])}</span>
                        </span>
                      ))}
                      <span className="mt-1.5 flex justify-between border-t border-white/15 pt-1.5">
                        <span>Kosten</span>
                        <span className="tabular">−{formatEuro(b.expenses)}</span>
                      </span>
                      <span className="flex justify-between font-semibold text-mint">
                        <span>Winst</span>
                        <span className="tabular">{formatEuro(b.profit)}</span>
                      </span>
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <div className="mt-2 flex justify-around border-t border-lijn pt-2 text-[13px] font-semibold text-inkt-zacht" aria-hidden>
            {bars.map((b) => (
              <span key={b.label} className="w-full text-center">
                {b.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </figure>
  )
}
