import { ICP_SEGMENTS, type SheetRecord } from '../domain/crm.js';

/**
 * Build a research prompt for the local Claude Code CLI. We ask Claude to
 * web-research a company and return STRICT JSON: a `fields` object whose keys
 * map directly onto our editable record fields, plus a `meta` block for
 * context the user reviews before applying. Claude is told not to fabricate.
 */
export function buildEnrichmentPrompt(kind: 'lead' | 'deal', record: SheetRecord): string {
  const company = String(record.company ?? '').trim();
  const known = Object.entries(record)
    .filter(([k, v]) => k !== '_row' && v != null && v !== '')
    .map(([k, v]) => `  - ${k}: ${JSON.stringify(v)}`)
    .join('\n');

  const leadFields = `
Return these keys inside "fields" ONLY when you find reliable info (omit or null otherwise):
  - contact: full name of the best primary contact (owner/principal/decision maker)
  - title: that contact's job title
  - phone: main business phone (digits/formatting as published)
  - email: a real, published business email (never guess a pattern)
  - state: 2-letter US state code of HQ (e.g. "NY", "NJ")
  - icpSegment: one of ${JSON.stringify(ICP_SEGMENTS)} based on company size/type
  - tradeFit: short trade descriptor (e.g. "Painting", "Drywall/Compounding", "GC self-perform")
  - source: where the info came from (e.g. "Company website", "Bluebook")
  - nextStep: a concise, concrete suggested next action for sales`;

  const dealFields = `
Return these keys inside "fields" ONLY when you find reliable info (omit or null otherwise):
  - nextStep: a concise, concrete suggested next action to advance this deal`;

  return `You are a B2B sales research assistant for Origin, a company that sells
construction robots (drywall finishing / painting) to contractors on a
per-robot monthly subscription. Research the company below using web search and
return enrichment data.

COMPANY: ${company || '(name unknown — infer nothing)'}
KIND: ${kind}
KNOWN FIELDS:
${known || '  (none)'}

INSTRUCTIONS:
- Use web search/fetch to find accurate, current, public information.
- Do NOT fabricate. If you cannot verify a value, omit it or use null.
- Never invent email addresses or phone numbers from patterns.
- Prefer the company's own website and reputable directories.
${kind === 'lead' ? leadFields : dealFields}

OUTPUT FORMAT — respond with a SINGLE JSON object and NOTHING else:
{
  "fields": { /* only the keys above you are confident about */ },
  "meta": {
    "website": "https://… or null",
    "summary": "2-4 sentence plain-English profile (size, location, trade, why they fit Origin)",
    "sources": ["url1", "url2"],
    "confidence": "low" | "medium" | "high"
  }
}`;
}
