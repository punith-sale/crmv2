export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/** Chip classes per pipeline stage (full literals so Tailwind keeps them). */
export const STAGE_STYLES: Record<string, string> = {
  Qualifying: 'bg-slate-50 text-slate-600 border-slate-200',
  Demo: 'bg-blue-50 text-blue-700 border-blue-200',
  Pilot: 'bg-violet-50 text-violet-700 border-violet-200',
  Negotiation: 'bg-amber-50 text-amber-700 border-amber-200',
  'Closed Won': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'On Hold': 'bg-zinc-100 text-zinc-500 border-zinc-200',
  'Closed Lost': 'bg-rose-50 text-rose-700 border-rose-200',
};

export const STAGE_DOT: Record<string, string> = {
  Qualifying: 'bg-slate-400',
  Demo: 'bg-blue-500',
  Pilot: 'bg-violet-500',
  Negotiation: 'bg-amber-500',
  'Closed Won': 'bg-emerald-500',
  'On Hold': 'bg-zinc-400',
  'Closed Lost': 'bg-rose-500',
};

export const STATUS_STYLES: Record<string, string> = {
  New: 'bg-blue-50 text-blue-700 border-blue-200',
  'Attempted to Contact': 'bg-amber-50 text-amber-700 border-amber-200',
  Connected: 'bg-violet-50 text-violet-700 border-violet-200',
  'Qualified (Convert to Deal)': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Bad Timing': 'bg-zinc-100 text-zinc-500 border-zinc-200',
  Unqualified: 'bg-rose-50 text-rose-700 border-rose-200',
};

export function stageStyle(stage: string): string {
  return STAGE_STYLES[stage] ?? 'bg-zinc-100 text-zinc-600 border-zinc-200';
}

export function statusStyle(status: string): string {
  return STATUS_STYLES[status] ?? 'bg-zinc-100 text-zinc-600 border-zinc-200';
}
