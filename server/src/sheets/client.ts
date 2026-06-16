import { google, type sheets_v4 } from 'googleapis';
import { getAuthClient } from '../auth/googleAuth.js';
import { config } from '../config.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('sheets');

export interface TabInfo {
  title: string;
  sheetId: number;
}

let apiPromise: Promise<sheets_v4.Sheets> | null = null;
let tabCache: TabInfo[] | null = null;

// Tiny read-through cache so the "live" UI stays snappy without a DB.
const valueCache = new Map<string, { at: number; rows: string[][] }>();
const VALUE_TTL_MS = 4000;

async function getApi(): Promise<sheets_v4.Sheets> {
  if (!apiPromise) {
    apiPromise = (async () => {
      const auth = await getAuthClient();
      return google.sheets({ version: 'v4', auth });
    })();
  }
  return apiPromise;
}

export function bustCache(): void {
  valueCache.clear();
}

export async function listTabs(force = false): Promise<TabInfo[]> {
  if (tabCache && !force) return tabCache;
  const sheets = await getApi();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: config.spreadsheetId,
    fields: 'sheets.properties(sheetId,title)',
  });
  tabCache = (meta.data.sheets ?? []).map((s) => ({
    title: s.properties?.title ?? '',
    sheetId: s.properties?.sheetId ?? 0,
  }));
  log.info(`Discovered tabs: ${tabCache.map((t) => t.title).join(', ')}`);
  return tabCache;
}

export async function resolveTab(kind: 'deals' | 'leads'): Promise<TabInfo> {
  const override = config.tabs[kind];
  const tabs = await listTabs();
  if (override) {
    const m = tabs.find((t) => t.title.toLowerCase() === override.toLowerCase());
    if (m) return m;
    log.warn(`Tab override "${override}" not found; falling back to auto-detect.`);
  }
  const keyword = kind === 'deals' ? 'deal' : 'lead';
  const m = tabs.find((t) => t.title.toLowerCase().includes(keyword));
  if (!m) {
    throw new Error(
      `Could not auto-detect the "${kind}" tab. Available tabs: ${tabs
        .map((t) => t.title)
        .join(', ')}. Set SHEET_TAB_${kind.toUpperCase()} in .env.`,
    );
  }
  return m;
}

/** Read all values of a tab as formatted strings. Cached briefly. */
export async function readTab(title: string): Promise<string[][]> {
  const cached = valueCache.get(title);
  if (cached && Date.now() - cached.at < VALUE_TTL_MS) return cached.rows;

  const sheets = await getApi();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range: `'${title}'`,
    valueRenderOption: 'FORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING',
  });
  const rows = (res.data.values ?? []) as string[][];
  valueCache.set(title, { at: Date.now(), rows });
  return rows;
}

/** Write specific cell ranges (A1 notation). Busts the cache. */
export async function batchUpdateCells(
  data: { range: string; value: string }[],
): Promise<void> {
  if (data.length === 0) return;
  const sheets = await getApi();
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: config.spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: data.map((d) => ({ range: d.range, values: [[d.value]] })),
    },
  });
  bustCache();
}

/** Append a full row to the bottom of a tab. Returns the new 1-based row. */
export async function appendRow(title: string, values: string[]): Promise<number> {
  const sheets = await getApi();
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: config.spreadsheetId,
    range: `'${title}'!A1`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [values] },
  });
  bustCache();
  // updatedRange looks like 'Deals'!A57:P57 — pull the row number.
  const m = res.data.updates?.updatedRange?.match(/!\D+(\d+)/);
  return m ? Number(m[1]) : -1;
}

/** Delete a 1-based row from a tab. */
export async function deleteRow(sheetId: number, row1: number): Promise<void> {
  const sheets = await getApi();
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: config.spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: row1 - 1,
              endIndex: row1,
            },
          },
        },
      ],
    },
  });
  bustCache();
}
