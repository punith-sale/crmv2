import { ASSUMPTIONS, CONVERT_STATUS, STAGES, stageDef, type SheetRecord } from './crm.js';

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function asDate(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysSince(d: Date, ref: Date): number {
  return Math.floor((ref.getTime() - d.getTime()) / 86_400_000);
}

function forecastOf(deal: SheetRecord): string | undefined {
  return (deal.forecastCategory as string) || stageDef(deal.stage as string)?.forecast;
}

export interface Dashboard {
  generatedAt: string;
  kpis: Record<string, number>;
  byStage: {
    stage: string;
    probability: number;
    forecast: string;
    deals: number;
    robotsPotential: number;
    mrrPotential: number;
  }[];
  byForecast: { category: string; deals: number; mrrPotential: number }[];
  needsAttention: {
    overdue: SheetRecord[];
    neglected: SheetRecord[];
    leadsToConvert: SheetRecord[];
  };
}

export function computeDashboard(deals: SheetRecord[], leads: SheetRecord[]): Dashboard {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isOpen = (d: SheetRecord) => stageDef(d.stage as string)?.open ?? false;
  const open = deals.filter(isOpen);
  const won = deals.filter((d) => String(d.stage).toLowerCase() === 'closed won');
  const sum = (arr: SheetRecord[], key: string) => arr.reduce((s, d) => s + num(d[key]), 0);

  const kpis = {
    mrrSigned: sum(won, 'mrrSigned'),
    arrSigned: sum(won, 'arrSigned'),
    robotsSigned: sum(won, 'robotsSigned'),
    openDeals: open.length,
    openPipelineMrr: sum(open, 'mrrPotential'),
    arrPotentialOpen: sum(open, 'arrPotential'),
    robotsPotentialOpen: sum(open, 'robotsPotential'),
    commitMrr: deals
      .filter((d) => forecastOf(d) === 'Commit')
      .reduce((s, d) => s + num(d.mrrPotential), 0),
    bestCaseMrr: deals
      .filter((d) => forecastOf(d) === 'Best Case')
      .reduce((s, d) => s + num(d.mrrPotential), 0),
    totalDeals: deals.length,
    totalLeads: leads.length,
  };

  const byStage = STAGES.map((s) => {
    const inStage = deals.filter(
      (d) => String(d.stage).toLowerCase() === s.name.toLowerCase(),
    );
    return {
      stage: s.name,
      probability: s.probability,
      forecast: s.forecast,
      deals: inStage.length,
      robotsPotential: sum(inStage, 'robotsPotential'),
      mrrPotential: sum(inStage, 'mrrPotential'),
    };
  });

  const forecastCats = ['Pipeline', 'Best Case', 'Commit', 'Closed', 'Omitted'];
  const byForecast = forecastCats.map((category) => {
    const inCat = deals.filter((d) => forecastOf(d) === category);
    return { category, deals: inCat.length, mrrPotential: sum(inCat, 'mrrPotential') };
  });

  const overdue = open
    .filter((d) => {
      const due = asDate(d.due);
      return due != null && due < today;
    })
    .sort((a, b) => String(a.due).localeCompare(String(b.due)));

  const neglected = open
    .map((d) => {
      const la = asDate(d.lastActivity);
      return { d, days: la ? daysSince(la, today) : Infinity };
    })
    .filter((x) => x.days >= ASSUMPTIONS.neglectedThresholdDays)
    .sort((a, b) => b.days - a.days)
    .map((x) => ({ ...x.d, daysSinceActivity: Number.isFinite(x.days) ? x.days : null }));

  const leadsToConvert = leads
    .filter((l) => String(l.leadStatus).toLowerCase() === CONVERT_STATUS.toLowerCase())
    .sort((a, b) => num(a.convertRank) - num(b.convertRank));

  return {
    generatedAt: new Date().toISOString(),
    kpis,
    byStage,
    byForecast,
    needsAttention: { overdue, neglected, leadsToConvert },
  };
}
