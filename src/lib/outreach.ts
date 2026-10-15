import type { Lead } from './types'

/** Voornaam uit "Voornaam Achternaam"; valt terug op de zaaknaam. */
export function firstName(lead: Pick<Lead, 'contact_name' | 'business_name'>) {
  return lead.contact_name?.trim().split(/\s+/)[0] || lead.business_name
}

/** Vult {voornaam}, {contact}, {zaak}, {gemeente}, {sector} en {afzender} in. */
export function fillTemplate(text: string, lead: Lead, sender: string) {
  const values: Record<string, string> = {
    voornaam: firstName(lead),
    contact: lead.contact_name ?? lead.business_name,
    zaak: lead.business_name,
    gemeente: lead.city ?? 'de Kempen',
    sector: lead.sector?.toLowerCase() ?? 'je sector',
    afzender: sender,
  }
  return text.replace(/\{(\w+)\}/g, (match, key: string) => values[key.toLowerCase()] ?? match)
}

export function mailtoLink(to: string, subject: string, body: string) {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

/** Platte tekst → eenvoudige, persoonlijke HTML-mail (geen nieuwsbriefopmaak: dat landt sneller in spam). */
export function outreachHtml(body: string) {
  const paragraphs = body
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('')
  return `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#1B2C5E">${paragraphs}
<p style="margin:24px 0 0;font-size:12px;color:#6b7280">Studio Kruispunt · social media voor zaken in de Kempen<br>Liever geen mails meer van ons? Antwoord gewoon "stop".</p></div>`
}

export function outreachText(body: string) {
  return `${body.trim()}\n\n--\nStudio Kruispunt · social media voor zaken in de Kempen\nLiever geen mails meer van ons? Antwoord gewoon "stop".`
}
