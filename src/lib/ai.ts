import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import type { Lead, LeadActivity, TemplateKind } from './types'

export function aiConfigured() {
  return !!process.env.ANTHROPIC_API_KEY
}

const SYSTEM = `Je schrijft outreach-mails voor Studio Kruispunt, een klein social-media-bureau uit de Kempen (Mol, Geel, Balen, Dessel, Retie, Turnhout, Herentals), gerund door Liam en Cedric.

Wat Studio Kruispunt doet: we komen naar de zaak, maken foto's en video's (reels, posts), plannen alles in en sturen elke maand een overzicht van bereik en groei. De zaakvoerder hoeft er alleen te zijn. Pakketten vanaf €650 per maand excl. btw. Een voorbeeldresultaat: Panterland (spelletjescafé in Mol) haalde 25.000 bereik en 6,4% engagement in 28 dagen.

Schrijfregels:
- Nederlands (Vlaams, natuurlijk), altijd "je", nooit "u".
- Kort: 60 tot 120 woorden. Geen lange opsommingen, geen marketingtaal ("revolutionair", "next level", "boost").
- Persoonlijk: verwijs concreet naar de zaak, de sector of de gemeente als je die info hebt. Verzin geen feiten over de zaak die niet in de gegevens staan.
- Eén duidelijke vraag aan het einde, meestal een vrijblijvende kennismaking van 30 minuten.
- Onderteken met de voornaam van de afzender. Geen handtekening met adres: die voegt de CRM zelf toe.
- Onderwerpregel: kort (max. 7 woorden), geen hoofdletters overal, geen uitroeptekens.`

const KIND_INSTRUCTIONS: Record<TemplateKind, string> = {
  eerste: 'Dit is het eerste contact. De zaak kent ons nog niet.',
  opvolging: 'Dit is een opvolging: we mailden of belden eerder maar kregen nog geen (duidelijk) antwoord. Verwijs kort naar het eerdere contact, blijf vriendelijk en geef een makkelijke uitweg.',
  na_gesprek: 'We hadden al een gesprek. Bedank voor het gesprek, vat de afspraak of volgende stap samen en vraag om een beslissing of een datum.',
}

type Draft = { subject: string; body: string }

/** Schrijft een gepersonaliseerde mail voor één lead met Claude. */
export async function draftOutreachEmail(input: {
  lead: Lead
  kind: TemplateKind
  sender: string
  history: Pick<LeadActivity, 'type' | 'subject' | 'body' | 'outcome' | 'created_at'>[]
  extra?: string | null
}): Promise<Draft> {
  const client = new Anthropic()
  const { lead } = input
  const facts = [
    `Zaak: ${lead.business_name}`,
    lead.contact_name && `Contactpersoon: ${lead.contact_name}`,
    lead.sector && `Sector: ${lead.sector}`,
    lead.city && `Gemeente: ${lead.city}`,
    lead.instagram && `Instagram: ${lead.instagram}`,
    lead.website && `Website: ${lead.website}`,
    lead.notes && `Notities van het team: ${lead.notes}`,
  ]
    .filter(Boolean)
    .join('\n')
  const history = input.history.length
    ? input.history
        .slice(0, 8)
        .map((a) => `- ${a.created_at.slice(0, 10)} ${a.type}${a.outcome ? ` (${a.outcome})` : ''}: ${[a.subject, a.body].filter(Boolean).join(' — ').slice(0, 400)}`)
        .join('\n')
    : 'Nog geen eerder contact.'

  const response = await client.beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: SYSTEM,
    output_config: {
      effort: 'low',
      format: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: {
            subject: { type: 'string', description: 'Onderwerpregel' },
            body: { type: 'string', description: 'Tekst van de mail, alinea’s gescheiden door een lege regel' },
          },
          required: ['subject', 'body'],
          additionalProperties: false,
        },
      },
    },
    messages: [
      {
        role: 'user',
        content: `${KIND_INSTRUCTIONS[input.kind]}

Afzender: ${input.sender}

Gegevens van de lead:
${facts}

Eerdere contactmomenten (nieuwste eerst):
${history}
${input.extra ? `\nExtra instructie van ${input.sender}: ${input.extra}` : ''}

Schrijf de mail.`,
      },
    ],
  })

  if (response.stop_reason === 'refusal') throw new Error('Claude schreef geen mail voor deze lead.')
  const text = response.content.find((b) => b.type === 'text')
  if (!text || text.type !== 'text') throw new Error('Geen antwoord ontvangen.')
  const parsed = JSON.parse(text.text) as Partial<Draft>
  if (!parsed.subject || !parsed.body) throw new Error('Onvolledig antwoord ontvangen.')
  return { subject: parsed.subject.trim(), body: parsed.body.trim() }
}
