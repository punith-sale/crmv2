import {
  DEAL_FIELDS,
  LEAD_FIELDS,
  stageDef,
  type FieldDef,
  type SheetRecord,
} from '../domain/crm.js';
import { colLetter, formatCell, parseCell } from './parse.js';
import {
  appendRow,
  batchUpdateCells,
  deleteRow,
  readTab,
  resolveTab,
  type TabInfo,
} from './client.js';

export type Kind = 'deals' | 'leads';

const FIELDS: Record<Kind, FieldDef[]> = { deals: DEAL_FIELDS, leads: LEAD_FIELDS };

function normalizeHeader(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

interface TableShape {
  tab: TabInfo;
  /** field key → 0-based column index */
  cols: Map<string, number>;
  width: number;
}

interface LoadedTable extends TableShape {
  records: SheetRecord[];
}

function resolveColumns(fields: FieldDef[], headerRow: string[]): TableShape['cols'] {
  const headerIndex = new Map<string, number>();
  headerRow.forEach((h, i) => {
    const norm = normalizeHeader(h);
    if (norm && !headerIndex.has(norm)) headerIndex.set(norm, i);
  });
  const cols = new Map<string, number>();
  for (const f of fields) {
    const candidates = [f.header, ...(f.aliases ?? [])].map(normalizeHeader);
    for (const c of candidates) {
      if (headerIndex.has(c)) {
        cols.set(f.key, headerIndex.get(c)!);
        break;
      }
    }
  }
  return cols;
}

/** Find the header row by scanning the first rows for the best field match. */
function detectHeaderRow(fields: FieldDef[], rows: string[][]): number {
  let bestIdx = 0;
  let bestScore = -1;
  const limit = Math.min(rows.length, 12);
  for (let i = 0; i < limit; i++) {
    const cols = resolveColumns(fields, rows[i] ?? []);
    if (cols.size > bestScore) {
      bestScore = cols.size;
      bestIdx = i;
    }
  }
  return bestScore >= 2 ? bestIdx : 0;
}

async function loadTable(kind: Kind): Promise<LoadedTable> {
  const fields = FIELDS[kind];
  const tab = await resolveTab(kind);
  const rows = await readTab(tab.title);
  const headerIdx = detectHeaderRow(fields, rows);
  const headerRow = rows[headerIdx] ?? [];
  const cols = resolveColumns(fields, headerRow);
  const width = headerRow.length || fields.length;

  const companyCol = cols.get('company');
  const records: SheetRecord[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    // Skip rows with no company (blank spacer rows).
    if (companyCol != null && !String(row[companyCol] ?? '').trim()) continue;
    const rec: SheetRecord = { _row: i + 1 };
    for (const f of fields) {
      const col = cols.get(f.key);
      rec[f.key] = col != null ? parseCell(row[col], f.type) : null;
    }
    records.push(rec);
  }
  return { tab, cols, width, records };
}

function writeValue(value: unknown, type: FieldDef['type']): string {
  const s = formatCell(value, type);
  // Prevent text that begins with "=" from being treated as a formula.
  if (type === 'text' && s.startsWith('=')) return `'${s}`;
  return s;
}

export async function getRecords(kind: Kind): Promise<SheetRecord[]> {
  return (await loadTable(kind)).records;
}

export async function updateRecord(
  kind: Kind,
  row: number,
  changes: Record<string, unknown>,
): Promise<SheetRecord> {
  const fields = FIELDS[kind];
  const { tab, cols } = await loadTable(kind);
  const cellWrites: { range: string; value: string }[] = [];

  for (const [key, value] of Object.entries(changes)) {
    if (key === '_row') continue;
    const field = fields.find((f) => f.key === key);
    const col = cols.get(key);
    if (!field || col == null) continue;
    const range = `'${tab.title}'!${colLetter(col + 1)}${row}`;
    cellWrites.push({ range, value: writeValue(value, field.type) });
  }
  await batchUpdateCells(cellWrites);

  const updated = (await loadTable(kind)).records.find((r) => r._row === row);
  if (!updated) throw new Error(`Row ${row} not found after update.`);
  return updated;
}

export async function createRecord(
  kind: Kind,
  values: Record<string, unknown>,
): Promise<SheetRecord> {
  const fields = FIELDS[kind];
  const { tab, cols, width } = await loadTable(kind);
  const rowArr = new Array<string>(width).fill('');
  for (const f of fields) {
    const col = cols.get(f.key);
    if (col == null) continue;
    if (values[f.key] != null && values[f.key] !== '') {
      rowArr[col] = writeValue(values[f.key], f.type);
    }
  }
  const newRow = await appendRow(tab.title, rowArr);
  const created = (await loadTable(kind)).records.find((r) => r._row === newRow);
  // Fall back to a synthetic record if append/read race loses the row.
  return created ?? { _row: newRow, ...values };
}

export async function deleteRecord(kind: Kind, row: number): Promise<void> {
  const { tab } = await loadTable(kind);
  await deleteRow(tab.sheetId, row);
}

/**
 * Promote a lead into the Deals tab and remove it from Leads — mirrors the
 * sheet's "conversion queue" workflow. Contact details (which Deals has no
 * columns for) are folded into the deal's Notes so nothing is lost.
 */
export async function convertLeadToDeal(
  leadRow: number,
  overrides: Record<string, unknown> = {},
): Promise<{ deal: SheetRecord; lead: SheetRecord }> {
  const leadTable = await loadTable('leads');
  const lead = leadTable.records.find((r) => r._row === leadRow);
  if (!lead) throw new Error(`Lead row ${leadRow} not found.`);

  const stageName = (overrides.stage as string) ?? 'Qualifying';
  const def = stageDef(stageName);
  const today = new Date().toISOString().slice(0, 10);

  const contactBits = [
    lead.contact && `Contact: ${lead.contact}${lead.title ? ` (${lead.title})` : ''}`,
    lead.phone && `Phone: ${lead.phone}`,
    lead.email && `Email: ${lead.email}`,
    lead.state && `State: ${lead.state}`,
    lead.source && `Source: ${lead.source}`,
    lead.icpSegment && `ICP: ${lead.icpSegment}`,
    lead.tradeFit && `Trade: ${lead.tradeFit}`,
  ].filter(Boolean);
  const notes = [lead.notes, contactBits.join(' · ')].filter(Boolean).join(' — ');

  const dealValues: Record<string, unknown> = {
    company: lead.company,
    owner: lead.owner || 'Punith',
    stage: stageName,
    probability: def?.probability ?? null,
    forecastCategory: def?.forecast ?? null,
    nextStep: lead.nextStep ?? '',
    lastActivity: today,
    notes,
    ...overrides,
  };

  const deal = await createRecord('deals', dealValues);
  await deleteRecord('leads', leadRow);
  return { deal, lead };
}

export async function getTabInfo(kind: Kind): Promise<TabInfo> {
  return resolveTab(kind);
}
