import type { FieldType } from '../domain/crm.js';

/** Sheet placeholders that mean "no value". */
const EMPTY_TOKENS = new Set(['', '-', '–', '—', 'n/a', 'na', 'tbd']);

function isEmpty(raw: string): boolean {
  return EMPTY_TOKENS.has(raw.trim().toLowerCase());
}

export function parseCell(raw: unknown, type: FieldType): unknown {
  const str = raw == null ? '' : String(raw).trim();
  switch (type) {
    case 'text':
      return str;
    case 'number': {
      if (isEmpty(str)) return null;
      const n = Number(str.replace(/[, ]/g, ''));
      return Number.isFinite(n) ? n : null;
    }
    case 'currency': {
      if (isEmpty(str)) return null;
      const n = Number(str.replace(/[$,\s]/g, ''));
      return Number.isFinite(n) ? n : null;
    }
    case 'percent': {
      if (isEmpty(str)) return null;
      const n = Number(str.replace(/[%\s]/g, ''));
      if (!Number.isFinite(n)) return null;
      // Sheets sometimes returns fractional (0.2) for percent-formatted cells.
      return n > 0 && n <= 1 ? Math.round(n * 100) : Math.round(n);
    }
    case 'date': {
      if (isEmpty(str)) return null;
      return normalizeDate(str);
    }
  }
}

/** Normalize a date-ish string to ISO YYYY-MM-DD; pass through if unparseable. */
export function normalizeDate(str: string): string {
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const d = new Date(str);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return str;
}

export function formatCell(value: unknown, type: FieldType): string {
  if (value == null || value === '') return '';
  switch (type) {
    case 'text':
      return String(value);
    case 'number':
      return String(value);
    case 'currency': {
      const n = Number(value);
      if (!Number.isFinite(n)) return '';
      return `$${n.toLocaleString('en-US')}`;
    }
    case 'percent': {
      const n = Number(value);
      if (!Number.isFinite(n)) return '';
      return `${n}%`;
    }
    case 'date':
      return normalizeDate(String(value));
  }
}

/** Convert a 1-based column index to an A1 column letter (1 → A, 27 → AA). */
export function colLetter(index1: number): string {
  let n = index1;
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}
