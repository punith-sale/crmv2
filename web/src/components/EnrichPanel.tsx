import { useState } from 'react';
import { ExternalLink, Sparkles, RotateCw } from 'lucide-react';
import { api } from '../api';
import type { Deal, EnrichResult, Lead } from '../types';
import { Spinner } from './atoms';
import { cx } from '../lib/ui';

const CONFIDENCE_STYLES: Record<string, string> = {
  high: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-zinc-100 text-zinc-500 border-zinc-200',
};

export function EnrichPanel({
  kind,
  record,
  onApply,
}: {
  kind: 'deal' | 'lead';
  record: Deal | Lead;
  onApply: (fields: Record<string, unknown>, meta: EnrichResult['meta']) => void;
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<EnrichResult | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  async function run() {
    setState('loading');
    setError('');
    try {
      const r = await api.enrich(kind, record);
      setResult(r);
      setSelected(Object.fromEntries(Object.keys(r.fields ?? {}).map((k) => [k, true])));
      setState('done');
    } catch (e) {
      setError((e as Error).message);
      setState('error');
    }
  }

  function apply() {
    if (!result) return;
    const chosen = Object.fromEntries(
      Object.entries(result.fields).filter(([k]) => selected[k]),
    );
    onApply(chosen, result.meta);
  }

  const fieldEntries = result ? Object.entries(result.fields) : [];

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-line bg-accent-soft/50 px-3 py-2">
        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-accent">
          <Sparkles size={14} /> Enrich with Claude
        </div>
        {state === 'done' || state === 'error' ? (
          <button className="btn-ghost text-[12px] text-muted" onClick={run}>
            <RotateCw size={13} /> Re-run
          </button>
        ) : null}
      </div>

      <div className="px-3 py-3">
        {state === 'idle' && (
          <div className="space-y-2.5">
            <p className="text-[12px] text-muted">
              Research <span className="font-medium text-ink">{record.company || 'this company'}</span> on
              the web and suggest field values. Runs locally via your Claude Code CLI.
            </p>
            <button className="btn btn-primary" onClick={run} disabled={!record.company}>
              <Sparkles size={14} /> Research company
            </button>
          </div>
        )}

        {state === 'loading' && (
          <div className="flex items-center gap-2 py-2 text-[12px] text-muted">
            <Spinner /> Researching {record.company}… this can take 30–90s.
          </div>
        )}

        {state === 'error' && (
          <div className="space-y-2">
            <p className="text-[12px] text-rose-600">{error}</p>
          </div>
        )}

        {state === 'done' && result && (
          <div className="space-y-3">
            {result.meta?.confidence && (
              <span
                className={cx(
                  'chip',
                  CONFIDENCE_STYLES[result.meta.confidence] ?? CONFIDENCE_STYLES.low,
                )}
              >
                {result.meta.confidence} confidence
              </span>
            )}
            {result.meta?.summary && (
              <p className="text-[12px] leading-relaxed text-muted">{result.meta.summary}</p>
            )}
            {result.meta?.website && (
              <a
                href={result.meta.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[12px] text-accent hover:underline"
              >
                {result.meta.website.replace(/^https?:\/\//, '')} <ExternalLink size={12} />
              </a>
            )}

            {fieldEntries.length > 0 ? (
              <div className="divide-y divide-line rounded-md border border-line">
                {fieldEntries.map(([key, value]) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-start gap-2 px-2.5 py-1.5 text-[12px] hover:bg-panel"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={selected[key] ?? false}
                      onChange={(e) => setSelected((s) => ({ ...s, [key]: e.target.checked }))}
                    />
                    <span className="min-w-0">
                      <span className="text-faint">{key}: </span>
                      <span className="break-words font-medium text-ink">{String(value)}</span>
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-faint">No confident field suggestions returned.</p>
            )}

            {result.meta?.sources && result.meta.sources.length > 0 && (
              <details className="text-[11px] text-faint">
                <summary className="cursor-pointer">Sources ({result.meta.sources.length})</summary>
                <ul className="mt-1 space-y-0.5">
                  {result.meta.sources.map((s, i) => (
                    <li key={i} className="truncate">
                      <a href={s} target="_blank" rel="noreferrer" className="hover:underline">
                        {s}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <button
              className="btn btn-primary w-full justify-center"
              onClick={apply}
              disabled={fieldEntries.length === 0}
            >
              Apply selected to form
            </button>
            <p className="text-[11px] text-faint">
              Applying fills the form only — review, then Save to write to the sheet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
