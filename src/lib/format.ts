const euro = new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const euroPrecise = new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' })
const dateFmt = new Intl.DateTimeFormat('nl-BE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Brussels' })
const dateShort = new Intl.DateTimeFormat('nl-BE', { day: 'numeric', month: 'short', timeZone: 'Europe/Brussels' })
const dateTimeFmt = new Intl.DateTimeFormat('nl-BE', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Brussels',
})

export function formatEuro(value: number | null | undefined, precise = false) {
  if (value == null) return '—'
  return (precise ? euroPrecise : euro).format(Number(value))
}

// Datums zonder tijd (yyyy-mm-dd) als middag UTC lezen, zodat de dag niet verschuift.
function parseDate(value: string) {
  return new Date(value.length === 10 ? `${value}T12:00:00Z` : value)
}

export function formatDate(value: string | null | undefined, short = false) {
  if (!value) return '—'
  return (short ? dateShort : dateFmt).format(parseDate(value))
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '—'
  return dateTimeFmt.format(new Date(value))
}

/** Vandaag als yyyy-mm-dd in Belgische tijd. */
export function todayISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(new Date())
}

export function addDaysISO(iso: string, days: number) {
  const d = parseDate(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function daysBetween(fromISO: string, toISO: string) {
  return Math.round((parseDate(toISO).getTime() - parseDate(fromISO).getTime()) / 86_400_000)
}

export function relativeDays(iso: string | null | undefined) {
  if (!iso) return ''
  const diff = daysBetween(todayISO(), iso)
  if (diff === 0) return 'vandaag'
  if (diff === 1) return 'morgen'
  if (diff === -1) return 'gisteren'
  if (diff > 0) return `over ${diff} dagen`
  return `${-diff} dagen geleden`
}

export function initials(name: string | null | undefined) {
  if (!name) return '?'
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}
