export interface Deal {
  _row: number;
  company: string;
  owner: string;
  stage: string;
  probability: number | null;
  forecastCategory: string;
  robotsPotential: number | null;
  robotsSigned: number | null;
  mrrPotential: number | null;
  mrrSigned: number | null;
  arrPotential: number | null;
  arrSigned: number | null;
  closeDate: string;
  nextStep: string;
  due: string;
  lastActivity: string;
  notes: string;
}

export interface Lead {
  _row: number;
  company: string;
  leadStatus: string;
  owner: string;
  priority: number | null;
  icpSegment: string;
  source: string;
  contact: string;
  title: string;
  phone: string;
  email: string;
  state: string;
  tradeFit: string;
  nextStep: string;
  notes: string;
  convertRank: number | null;
}

export interface StageDef {
  name: string;
  probability: number;
  forecast: string;
  open: boolean;
}

export interface FieldDef {
  key: string;
  header: string;
  type: 'text' | 'number' | 'currency' | 'percent' | 'date';
}

export interface Meta {
  authorized: boolean;
  demo?: boolean;
  tabs: { deals?: string; leads?: string };
  plugins: { name: string; description?: string; routeBase: string }[];
  config: {
    stages: StageDef[];
    leadStatuses: string[];
    icpSegments: string[];
    owners: string[];
    activityTypes: string[];
    assumptions: Record<string, number>;
    dealFields: FieldDef[];
    leadFields: FieldDef[];
  };
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
    overdue: Deal[];
    neglected: (Deal & { daysSinceActivity: number | null })[];
    leadsToConvert: Lead[];
  };
}

export interface EnrichResult {
  fields: Record<string, unknown>;
  meta: {
    website?: string | null;
    summary?: string;
    sources?: string[];
    confidence?: 'low' | 'medium' | 'high';
  };
  raw?: string;
}
