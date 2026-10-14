export type ActionState = { ok?: boolean; error?: string; at?: number }

export const ok = (): ActionState => ({ ok: true, at: Date.now() })
export const fail = (error: string): ActionState => ({ error, at: Date.now() })

export function str(fd: FormData, key: string) {
  const v = fd.get(key)
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t === '' ? null : t
}

export function num(fd: FormData, key: string) {
  const v = str(fd, key)
  if (v == null) return null
  const n = Number(v.replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function oneOf<T extends string>(fd: FormData, key: string, allowed: readonly T[], fallback: T): T {
  const v = str(fd, key)
  return v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback
}

/** Accepteert enkel http(s)-links (Google Drive e.d.). */
export function url(fd: FormData, key: string) {
  const v = str(fd, key)
  if (!v) return null
  const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`
  try {
    const u = new URL(withProto)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null
  } catch {
    return null
  }
}
