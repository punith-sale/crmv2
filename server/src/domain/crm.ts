/**
 * Canonical CRM domain model, derived from the structure of the
 * `Origin_Sales_CRM_v2` Google Sheet (Deals / Leads / Config tabs).
 *
 * These constants drive the UI dropdowns, the Kanban columns, the
 * stage → probability → forecast mapping for new deals, and the
 * dashboard math. They mirror the sheet's "Config / Lists" tab so the
 * app stays faithful to the source of truth. If you change them in the
 * sheet, mirror the change here (kept in code so dashboard numbers are
 * deterministic and the app works even when the Config tab is edited).
 */

export type ForecastCategory =
  | 'Pipeline'
  | 'Best Case'
  | 'Commit'
  | 'Closed'
  | 'Omitted';

export interface StageDef {
  name: string;
  probability: number; // 0–100
  forecast: ForecastCategory;
  /** Open = still an active opportunity (counts toward "open deals"). */
  open: boolean;
}

export const STAGES: StageDef[] = [
  { name: 'Qualifying', probability: 20, forecast: 'Pipeline', open: true },
  { name: 'Demo', probability: 40, forecast: 'Pipeline', open: true },
  { name: 'Pilot', probability: 60, forecast: 'Best Case', open: true },
  { name: 'Negotiation', probability: 85, forecast: 'Commit', open: true },
  { name: 'Closed Won', probability: 100, forecast: 'Closed', open: false },
  { name: 'On Hold', probability: 10, forecast: 'Omitted', open: true },
  { name: 'Closed Lost', probability: 0, forecast: 'Omitted', open: false },
];

export const STAGE_NAMES = STAGES.map((s) => s.name);

export function stageDef(name: string | null | undefined): StageDef | undefined {
  if (!name) return undefined;
  return STAGES.find((s) => s.name.toLowerCase() === name.toLowerCase());
}

export const LEAD_STATUSES = [
  'New',
  'Attempted to Contact',
  'Connected',
  'Qualified (Convert to Deal)',
  'Bad Timing',
  'Unqualified',
] as const;

/** Leads in this status are ready to be promoted into the Deals tab. */
export const CONVERT_STATUS = 'Qualified (Convert to Deal)';

export const ICP_SEGMENTS = [
  'P0 Small',
  'P0 Mid-Market',
  'P1 Large',
  'P2 GC Self-Perform',
  'P3 Micro',
] as const;

export const OWNERS = ['Punith', 'Unassigned'] as const;

export const ACTIVITY_TYPES = [
  'Call',
  'Email',
  'Meeting',
  'Demo',
  'Site Visit',
  'WhatsApp/Text',
  'Note',
] as const;

export const ASSUMPTIONS = {
  steadyStateMrrPerRobot: 20_000,
  pilotMonthRatePerRobot: 10_000,
  neglectedThresholdDays: 30,
} as const;

// ── Field definitions ───────────────────────────────────────────────────────
// Each field maps a canonical key to the sheet column header (plus aliases for
// resilience) and a value type used for parsing/formatting.

export type FieldType = 'text' | 'number' | 'currency' | 'percent' | 'date';

export interface FieldDef {
  key: string;
  header: string; // primary header text in the sheet
  aliases?: string[]; // alternative header spellings
  type: FieldType;
}

export const DEAL_FIELDS: FieldDef[] = [
  { key: 'company', header: 'Deal / Company', aliases: ['Deal/Company', 'Company', 'Deal'], type: 'text' },
  { key: 'owner', header: 'Owner', type: 'text' },
  { key: 'stage', header: 'Stage', type: 'text' },
  { key: 'probability', header: 'Prob.', aliases: ['Probability', 'Prob'], type: 'percent' },
  { key: 'forecastCategory', header: 'Forecast Category', aliases: ['Forecast'], type: 'text' },
  { key: 'robotsPotential', header: 'Robots (Potential)', aliases: ['Robots Potential'], type: 'number' },
  { key: 'robotsSigned', header: 'Robots (Signed)', aliases: ['Robots Signed'], type: 'number' },
  { key: 'mrrPotential', header: 'MRR Potential ($)', aliases: ['MRR Potential'], type: 'currency' },
  { key: 'mrrSigned', header: 'MRR Signed ($)', aliases: ['MRR Signed'], type: 'currency' },
  { key: 'arrPotential', header: 'ARR Potential ($)', aliases: ['ARR Potential'], type: 'currency' },
  { key: 'arrSigned', header: 'ARR Signed ($)', aliases: ['ARR Signed'], type: 'currency' },
  { key: 'closeDate', header: 'Close Date', type: 'date' },
  { key: 'nextStep', header: 'Next Step', type: 'text' },
  { key: 'due', header: 'Due', type: 'date' },
  { key: 'lastActivity', header: 'Last Activity', type: 'date' },
  { key: 'notes', header: 'Notes', type: 'text' },
];

export const LEAD_FIELDS: FieldDef[] = [
  { key: 'company', header: 'Company', type: 'text' },
  { key: 'leadStatus', header: 'Lead Status', aliases: ['Status'], type: 'text' },
  { key: 'owner', header: 'Owner', type: 'text' },
  { key: 'priority', header: 'Priority', type: 'number' },
  { key: 'icpSegment', header: 'ICP Segment', aliases: ['ICP', 'Segment'], type: 'text' },
  { key: 'source', header: 'Source', type: 'text' },
  { key: 'contact', header: 'Contact', type: 'text' },
  { key: 'title', header: 'Title', type: 'text' },
  { key: 'phone', header: 'Phone', type: 'text' },
  { key: 'email', header: 'Email', type: 'text' },
  { key: 'state', header: 'State', type: 'text' },
  { key: 'tradeFit', header: 'Trade Fit', aliases: ['Trade'], type: 'text' },
  { key: 'nextStep', header: 'Next Step', type: 'text' },
  { key: 'notes', header: 'Notes', type: 'text' },
  { key: 'convertRank', header: 'ConvertRank', aliases: ['Convert Rank'], type: 'number' },
];

export interface SheetRecord {
  /** 1-based sheet row number. Stable key for updates/deletes. */
  _row: number;
  [key: string]: unknown;
}
