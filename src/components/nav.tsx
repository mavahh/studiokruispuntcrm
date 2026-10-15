'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Bell, Clapperboard, FileSignature, FolderKanban, LayoutDashboard, ListChecks, LogOut, Megaphone, Menu, PiggyBank, Users, X } from 'lucide-react'
import { logoutAction } from '@/actions/account'
import { Avatar, Logo } from '@/components/ui'

const items = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/klanten', label: 'Klanten', icon: Users },
  { href: '/outreach', label: 'Outreach', icon: Megaphone },
  { href: '/content', label: 'Content', icon: Clapperboard },
  { href: '/projecten', label: 'Projecten', icon: FolderKanban },
  { href: '/taken', label: 'Mijn taken', icon: ListChecks },
  { href: '/contracten', label: 'Contracten', icon: FileSignature },
  { href: '/financien', label: 'Omzet & winst', icon: PiggyBank },
]

function isActive(path: string, href: string) {
  return href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`)
}

function NavLinks({ unread, contractAlerts, followUps, onNavigate }: { unread: number; contractAlerts: number; followUps: number; onNavigate?: () => void }) {
  const path = usePathname()
  const link = (href: string, label: string, Icon: typeof Bell, badge?: number, badgeTone = 'bg-mint text-nacht') => {
    const active = isActive(path, href)
    return (
      <Link
        key={href}
        href={href}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        className={`flex h-10 items-center gap-3 rounded-veld px-3 text-[14px] font-semibold transition-colors duration-150 ${
          active ? 'bg-white/12 text-white' : 'text-white/70 hover:bg-white/6 hover:text-white'
        }`}
      >
        <Icon size={18} className={active ? 'text-mint' : ''} aria-hidden />
        <span className="flex-1">{label}</span>
        {!!badge && <span className={`tabular rounded-full px-1.5 text-[11px] leading-[18px] font-bold ${badgeTone}`}>{badge}</span>}
      </Link>
    )
  }
  return (
    <nav className="grid gap-0.5" aria-label="Hoofdmenu">
      {items.map((i) =>
        link(i.href, i.label, i.icon, i.href === '/contracten' ? contractAlerts : i.href === '/outreach' ? followUps : undefined, 'bg-signaal text-nacht'),
      )}
      <div className="my-3 h-px bg-white/10" />
      {link('/meldingen', 'Meldingen', Bell, unread)}
    </nav>
  )
}

function UserBlock({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-3 border-t border-white/10 pt-4">
      <Avatar name={name} size={32} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold text-white">{name}</div>
        <Link href="/account" className="text-[12px] text-white/60 hover:text-mint">
          Account
        </Link>
      </div>
      <form action={logoutAction}>
        <button className="btn btn-icon text-white/70 hover:bg-white/10 hover:text-white" aria-label="Uitloggen" title="Uitloggen">
          <LogOut size={17} />
        </button>
      </form>
    </div>
  )
}

export function TeamNav({ name, unread, contractAlerts, followUps }: { name: string; unread: number; contractAlerts: number; followUps: number }) {
  const [open, setOpen] = useState(false)
  const path = usePathname()
  useEffect(() => setOpen(false), [path])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
  }, [open])

  return (
    <>
      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col bg-nacht px-3 py-5 lg:flex">
        <Link href="/" className="mb-8 px-3" aria-label="Studio Kruispunt, naar dashboard">
          <Logo light />
        </Link>
        <div className="flex-1 overflow-y-auto">
          <NavLinks unread={unread} contractAlerts={contractAlerts} followUps={followUps} />
        </div>
        <UserBlock name={name} />
      </aside>

      {/* Mobiel */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-nacht px-4 pt-[env(safe-area-inset-top)] lg:hidden">
        <Link href="/" aria-label="Studio Kruispunt, naar dashboard">
          <Logo light size="sm" />
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/meldingen" className="btn btn-icon relative text-white" aria-label={`Meldingen (${unread} ongelezen)`}>
            <Bell size={19} />
            {unread > 0 && <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-mint" />}
          </Link>
          <button className="btn btn-icon text-white" aria-label="Menu openen" aria-expanded={open} onClick={() => setOpen(true)}>
            <Menu size={20} />
          </button>
        </div>
      </header>
      <div
        className={`fixed inset-0 z-40 bg-nacht/50 transition-opacity duration-300 lg:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-[min(300px,85vw)] flex-col bg-nacht px-3 pt-[calc(env(safe-area-inset-top)+16px)] pb-[calc(env(safe-area-inset-bottom)+16px)] lg:hidden ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ transition: 'transform 300ms var(--ease-drawer)' }}
        aria-hidden={!open}
        inert={!open}
      >
        <div className="mb-6 flex items-center justify-between px-3">
          <Logo light size="sm" />
          <button className="btn btn-icon text-white" aria-label="Menu sluiten" onClick={() => setOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavLinks unread={unread} contractAlerts={contractAlerts} followUps={followUps} onNavigate={() => setOpen(false)} />
        </div>
        <UserBlock name={name} />
      </aside>
    </>
  )
}
