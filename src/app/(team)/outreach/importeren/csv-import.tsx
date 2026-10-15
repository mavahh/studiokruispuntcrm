'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { Upload } from 'lucide-react'
import { importLeadsAction, type ImportRow } from '@/actions/outreach'

type Field = keyof ImportRow

const FIELDS: { key: Field; label: string; aliases: string[] }[] = [
  { key: 'business_name', label: 'Naam zaak', aliases: ['zaak', 'bedrijf', 'bedrijfsnaam', 'naam zaak', 'naam', 'company', 'business', 'business name', 'onderneming'] },
  { key: 'contact_name', label: 'Contactpersoon', aliases: ['contact', 'contactpersoon', 'zaakvoerder', 'eigenaar', 'contact name', 'voornaam'] },
  { key: 'email', label: 'E-mail', aliases: ['email', 'e-mail', 'mail', 'emailadres', 'e-mailadres'] },
  { key: 'phone', label: 'Telefoon', aliases: ['telefoon', 'tel', 'gsm', 'phone', 'telefoonnummer', 'nummer'] },
  { key: 'city', label: 'Gemeente', aliases: ['gemeente', 'stad', 'plaats', 'city', 'woonplaats', 'locatie'] },
  { key: 'sector', label: 'Sector', aliases: ['sector', 'branche', 'categorie', 'type', 'industry'] },
  { key: 'website', label: 'Website', aliases: ['website', 'site', 'url', 'web'] },
  { key: 'instagram', label: 'Instagram', aliases: ['instagram', 'insta', 'ig'] },
  { key: 'notes', label: 'Notities', aliases: ['notities', 'notitie', 'opmerking', 'opmerkingen', 'notes', 'info'] },
]

/** Kleine CSV-parser: herkent ; of , (Belgische Excel gebruikt ;), aanhalingstekens en regeleindes in velden. */
function parseCsv(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ';' : firstLine.includes('\t') ? '\t' : ','
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === delimiter) {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      if (row.some((v) => v.trim())) rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  row.push(field)
  if (row.some((v) => v.trim())) rows.push(row)
  return rows
}

function guessMapping(headers: string[]) {
  const mapping: Partial<Record<Field, number>> = {}
  headers.forEach((h, i) => {
    const norm = h.trim().toLowerCase()
    const field = FIELDS.find((f) => f.aliases.includes(norm))
    if (field && mapping[field.key] === undefined) mapping[field.key] = i
  })
  return mapping
}

export function CsvImport() {
  const [rows, setRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Partial<Record<Field, number>>>({})
  const [result, setResult] = useState<{ inserted?: number; skipped?: number; error?: string } | null>(null)
  const [pending, start] = useTransition()

  const headers = rows[0] ?? []
  const data = rows.slice(1)

  function load(text: string) {
    const parsed = parseCsv(text.replace(/^﻿/, ''))
    setRows(parsed)
    setMapping(guessMapping(parsed[0] ?? []))
    setResult(null)
  }

  const preview = useMemo(
    () =>
      data.map((r) => {
        const out: ImportRow = { business_name: '' }
        for (const f of FIELDS) {
          const idx = mapping[f.key]
          if (idx !== undefined) out[f.key] = r[idx]?.trim() ?? ''
        }
        return out
      }),
    [data, mapping],
  )
  const valid = preview.filter((r) => r.business_name)

  return (
    <div className="grid gap-6">
      <section className="card p-5">
        <h2 className="mb-1 text-[17px] font-semibold">1. Kies een bestand of plak je lijst</h2>
        <p className="mb-4 text-[14px] text-inkt-zacht">
          Exporteer in Excel of Google Sheets als <strong>CSV</strong>. De eerste rij moet de kolomnamen bevatten (bv. Zaak, Contactpersoon, E-mail, Telefoon,
          Gemeente, Sector).
        </p>
        <label className="btn btn-secondary cursor-pointer">
          <Upload size={16} aria-hidden /> CSV-bestand kiezen
          <input
            type="file"
            accept=".csv,text/csv,.txt"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (file) load(await file.text())
            }}
          />
        </label>
        <label className="mt-4 block">
          <span className="label">Of plak hier (bv. rechtstreeks uit Google Sheets)</span>
          <textarea className="field font-mono text-[13px]" rows={5} placeholder={'Zaak;Contactpersoon;E-mail;Gemeente\nFrituur De Hoek;Karel Wouters;karel@…;Mol'} onChange={(e) => load(e.target.value)} />
        </label>
      </section>

      {headers.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-1 text-[17px] font-semibold">2. Controleer de kolommen</h2>
          <p className="mb-4 text-[14px] text-inkt-zacht">We herkenden de kolommen automatisch. Pas aan waar nodig. Enkel "Naam zaak" is verplicht.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FIELDS.map((f) => (
              <label key={f.key} className="block">
                <span className="label">
                  {f.label}
                  {f.key === 'business_name' && <span className="text-rood"> *</span>}
                </span>
                <select
                  className="field"
                  value={mapping[f.key] ?? ''}
                  onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value === '' ? undefined : Number(e.target.value) }))}
                >
                  <option value="">— niet importeren —</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `Kolom ${i + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </section>
      )}

      {headers.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-1 text-[17px] font-semibold">3. Importeren</h2>
          <p className="mb-4 text-[14px] text-inkt-zacht">
            {valid.length} van {data.length} rijen hebben een zaaknaam. Dubbels (zelfde e-mail, of zelfde naam en gemeente) worden overgeslagen.
          </p>
          <div className="mb-4 overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="text-inkt-zacht">
                  <th className="py-1.5 pr-4">Zaak</th>
                  <th className="py-1.5 pr-4">Contact</th>
                  <th className="py-1.5 pr-4">E-mail</th>
                  <th className="py-1.5 pr-4">Gemeente</th>
                  <th className="py-1.5 pr-4">Sector</th>
                </tr>
              </thead>
              <tbody>
                {valid.slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-t border-lijn">
                    <td className="py-1.5 pr-4 font-semibold">{r.business_name}</td>
                    <td className="py-1.5 pr-4">{r.contact_name}</td>
                    <td className="py-1.5 pr-4">{r.email}</td>
                    <td className="py-1.5 pr-4">{r.city}</td>
                    <td className="py-1.5 pr-4">{r.sector}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {valid.length > 5 && <p className="mt-1 text-[12px] text-inkt-zacht">…en nog {valid.length - 5} meer</p>}
          </div>
          {result?.error && <p className="mb-3 rounded-veld bg-rood-soft px-3 py-2 text-[14px] text-rood">{result.error}</p>}
          {result?.inserted !== undefined ? (
            <div className="rounded-veld bg-mint-soft px-4 py-3 text-[14px] text-groen">
              <strong>{result.inserted} leads geïmporteerd</strong>
              {result.skipped ? `, ${result.skipped} overgeslagen (dubbel of zonder naam)` : ''}.{' '}
              <Link href="/outreach?weergave=lijst&status=nieuw" className="link">
                Bekijk de nieuwe leads
              </Link>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              disabled={pending || valid.length === 0}
              onClick={() => start(async () => setResult(await importLeadsAction(valid)))}
            >
              {pending ? 'Importeren…' : `${valid.length} leads importeren`}
            </button>
          )}
        </section>
      )}
    </div>
  )
}
