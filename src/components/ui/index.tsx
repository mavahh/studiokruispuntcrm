import Link from 'next/link'
import type { Tone } from '@/lib/constants'
import { initials } from '@/lib/format'

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-hemel-soft text-nacht',
  blue: 'bg-blauw text-white',
  mint: 'bg-mint-soft text-groen',
  signal: 'bg-signaal-soft text-[#9a4300]',
  muted: 'bg-papier text-inkt-zacht border border-lijn',
  danger: 'bg-rood-soft text-rood',
}

export function Badge({ tone = 'neutral', children, className = '' }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[12px] font-semibold whitespace-nowrap ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  )
}

export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
}: {
  title: React.ReactNode
  eyebrow?: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h1 className="text-[28px] leading-[1.1] font-bold md:text-[34px]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-inkt-zacht">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ title, actions, children, className = '', padded = true }: {
  title?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  padded?: boolean
}) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-lijn px-5 py-3.5">
          {title && <h2 className="text-[17px] font-semibold">{title}</h2>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </section>
  )
}

export function Stat({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: 'default' | 'dark' }) {
  const dark = tone === 'dark'
  return (
    <div className={`rounded-kaart p-5 ${dark ? 'bg-nacht text-white' : 'card'}`}>
      <div className={`text-[13px] font-semibold ${dark ? 'text-white/75' : 'text-inkt-zacht'}`}>{label}</div>
      <div className={`tabular mt-2 font-display text-[28px] leading-none font-bold ${dark ? 'text-white' : 'text-nacht'}`}>{value}</div>
      {hint && <div className={`mt-2 text-[13px] ${dark ? 'text-mint' : 'text-inkt-zacht'}`}>{hint}</div>}
    </div>
  )
}

export function EmptyState({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-kaart border border-dashed border-lijn bg-white/60 px-6 py-10 text-center">
      <CrossMark className="mb-3 h-7 w-7 text-hemel" />
      <p className="font-display text-[17px] font-semibold text-nacht">{title}</p>
      {children && <p className="mt-1 max-w-sm text-[14px] text-inkt-zacht">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Avatar({ name, size = 28 }: { name: string | null | undefined; size?: number }) {
  return (
    <span
      title={name ?? undefined}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-blauw font-semibold text-white"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {initials(name)}
    </span>
  )
}

/** Het mint kruis uit het Studio Kruispunt-logo. */
export function CrossMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 483.16 483.16" aria-hidden="true" className={className} fill="currentColor">
      <polygon points="381.32 0 448.85 178.15 421.36 202.32 367.47 249.69 432.84 324.07 483.16 381.32 305.01 448.85 280.84 421.36 233.48 367.47 159.1 432.84 101.84 483.16 34.31 305.01 61.81 280.84 115.7 233.48 50.32 159.1 0 101.84 178.15 34.31 202.32 61.81 249.69 115.7 324.07 50.32 381.32 0" />
    </svg>
  )
}

const logoHeights = { sm: 40, md: 52, lg: 84 } as const

/** Volledig logo: wit op donkere vlakken, Kruispunt Blauw op licht. */
export function Logo({ light = false, size = 'md' }: { light?: boolean; size?: keyof typeof logoHeights }) {
  const h = logoHeights[size]
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={light ? '/logo-wit.svg' : '/logo-blauw.svg'}
      alt="Studio Kruispunt"
      width={Math.round((h * 738.3) / 483.16)}
      height={h}
      className="block shrink-0 self-start"
      style={{ height: h, width: 'auto' }}
    />
  )
}

export function Tabs({ tabs, active }: { tabs: { href: string; label: string; count?: number }[]; active: string }) {
  return (
    <nav className="-mx-4 mb-6 overflow-x-auto px-4 md:mx-0 md:px-0" aria-label="Tabbladen">
      <div className="flex min-w-max gap-1 border-b border-lijn">
        {tabs.map((t) => {
          const isActive = t.href === active
          return (
            <Link
              key={t.href}
              href={t.href}
              scroll={false}
              aria-current={isActive ? 'page' : undefined}
              className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-[14px] font-semibold transition-colors duration-150 ${
                isActive ? 'border-mint text-nacht' : 'border-transparent text-inkt-zacht hover:text-nacht'
              }`}
            >
              {t.label}
              {t.count != null && (
                <span className="tabular rounded-full bg-hemel-soft px-1.5 text-[11px] text-nacht">{t.count}</span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full text-left text-[14px] [&_td]:border-t [&_td]:border-lijn [&_td]:px-5 [&_td]:py-3 [&_th]:px-5 [&_th]:py-2.5 [&_th]:text-[12px] [&_th]:font-semibold [&_th]:tracking-[0.06em] [&_th]:text-inkt-zacht [&_th]:uppercase">
        {children}
      </table>
    </div>
  )
}

export function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="link">
      {children}
    </a>
  )
}
