import { stageDef, type SheetRecord } from '../domain/crm.js';
import { DEMO_DEALS, DEMO_LEADS } from './demoData.js';
import type { Kind } from './repository.js';

/**
 * In-memory data store used when DEMO=1. Mirrors the repository API so routes
 * work identically without Google. State resets when the server restarts.
 */
const clone = (rows: SheetRecord[]) => rows.map((r) => ({ ...r }));

const store: Record<Kind, SheetRecord[]> = {
  deals: clone(DEMO_DEALS),
  leads: clone(DEMO_LEADS),
};

function nextRow(kind: Kind): number {
  return store[kind].reduce((m, r) => Math.max(m, r._row), 1) + 1;
}

export function getRecords(kind: Kind): SheetRecord[] {
  return clone(store[kind]);
}

export function updateRecord(kind: Kind, row: number, changes: Record<string, unknown>): SheetRecord {
  const rec = store[kind].find((r) => r._row === row);
  if (!rec) throw new Error(`Row ${row} not found.`);
  for (const [k, v] of Object.entries(changes)) {
    if (k !== '_row') rec[k] = v;
  }
  return { ...rec };
}

export function createRecord(kind: Kind, values: Record<string, unknown>): SheetRecord {
  const rec: SheetRecord = { _row: nextRow(kind), ...values };
  store[kind].push(rec);
  return { ...rec };
}

export function deleteRecord(kind: Kind, row: number): void {
  store[kind] = store[kind].filter((r) => r._row !== row);
}

export function convertLeadToDeal(
  leadRow: number,
  overrides: Record<string, unknown> = {},
): { deal: SheetRecord; lead: SheetRecord } {
  const lead = store.leads.find((r) => r._row === leadRow);
  if (!lead) throw new Error(`Lead row ${leadRow} not found.`);
  const stageName = (overrides.stage as string) ?? 'Qualifying';
  const def = stageDef(stageName);
  const today = new Date().toISOString().slice(0, 10);
  const contactBits = [
    lead.contact && `Contact: ${lead.contact}${lead.title ? ` (${lead.title})` : ''}`,
    lead.phone && `Phone: ${lead.phone}`,
    lead.email && `Email: ${lead.email}`,
    lead.state && `State: ${lead.state}`,
  ].filter(Boolean);
  const deal = createRecord('deals', {
    company: lead.company,
    owner: lead.owner || 'Punith',
    stage: stageName,
    probability: def?.probability ?? null,
    forecastCategory: def?.forecast ?? null,
    nextStep: lead.nextStep ?? '',
    lastActivity: today,
    notes: [lead.notes, contactBits.join(' · ')].filter(Boolean).join(' — '),
    ...overrides,
  });
  deleteRecord('leads', leadRow);
  return { deal, lead: { ...lead } };
}
