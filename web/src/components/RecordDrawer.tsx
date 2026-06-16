import { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, Trash2 } from 'lucide-react';
import { Drawer } from './Drawer';
import { EnrichPanel } from './EnrichPanel';
import { Spinner } from './atoms';
import {
  useConvertLead,
  useDeleteDeal,
  useDeleteLead,
  useMeta,
  useUpdateDeal,
  useUpdateLead,
} from '../api';
import type { Deal, EnrichResult, FieldDef, Lead } from '../types';
import { cx, stageStyle } from '../lib/ui';

type Kind = 'deal' | 'lead';
type Rec = Record<string, unknown>;

const TEXTAREA_FIELDS = new Set(['notes', 'nextStep']);
const DEAL_DERIVED = new Set(['probability', 'forecastCategory']);

export function RecordDrawer({
  kind,
  record,
  onClose,
}: {
  kind: Kind;
  record: Deal | Lead | null;
  onClose: () => void;
}) {
  const { data: meta } = useMeta();
  const [draft, setDraft] = useState<Rec | null>(null);

  const updateDeal = useUpdateDeal();
  const updateLead = useUpdateLead();
  const deleteDeal = useDeleteDeal();
  const deleteLead = useDeleteLead();
  const convertLead = useConvertLead();

  // Reset the draft only when a different record is opened (not on background refetch).
  useEffect(() => {
    setDraft(record ? ({ ...record } as Rec) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?._row, kind]);

  const fields: FieldDef[] = useMemo(() => {
    if (!meta) return [];
    return kind === 'deal' ? meta.config.dealFields : meta.config.leadFields;
  }, [meta, kind]);

  if (!record || !draft || !meta) return null;

  const base = record as unknown as Rec;
  const changes: Record<string, unknown> = {};
  for (const f of fields) {
    if (draft[f.key] !== base[f.key]) changes[f.key] = draft[f.key] ?? '';
  }
  const dirty = Object.keys(changes).length > 0;
  const saving = updateDeal.isPending || updateLead.isPending;

  function setField(key: string, value: unknown) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  function applyEnrichment(applied: Record<string, unknown>, m: EnrichResult['meta']) {
    setDraft((d) => {
      if (!d) return d;
      const next = { ...d, ...applied };
      const extra = [m.website && `Website: ${m.website}`, m.summary].filter(Boolean).join(' — ');
      if (extra) next.notes = [d.notes, extra].filter(Boolean).join('\n');
      return next;
    });
  }

  async function save() {
    if (!dirty) return;
    if (kind === 'deal') await updateDeal.mutateAsync({ row: record!._row, body: changes });
    else await updateLead.mutateAsync({ row: record!._row, body: changes });
    onClose();
  }

  async function remove() {
    if (!confirm(`Delete "${record!.company}"? This removes the row from the sheet.`)) return;
    if (kind === 'deal') await deleteDeal.mutateAsync(record!._row);
    else await deleteLead.mutateAsync(record!._row);
    onClose();
  }

  async function convert() {
    if (!confirm(`Convert "${record!.company}" into a Deal and remove it from Leads?`)) return;
    await convertLead.mutateAsync({ row: record!._row });
    onClose();
  }

  function enumOptions(key: string): string[] | null {
    if (key === 'owner') {
      const set = new Set([...meta!.config.owners, String(draft![key] ?? '')].filter(Boolean));
      return [...set];
    }
    if (kind === 'deal' && key === 'stage') return meta!.config.stages.map((s) => s.name);
    if (kind === 'lead' && key === 'leadStatus') return [...meta!.config.leadStatuses];
    if (kind === 'lead' && key === 'icpSegment') return ['', ...meta!.config.icpSegments];
    return null;
  }

  const stageDef = meta.config.stages.find(
    (s) => s.name === String(draft.stage),
  );

  return (
    <Drawer
      open={!!record}
      onClose={onClose}
      title={String(draft.company || '(unnamed)')}
      subtitle={
        kind === 'deal' ? (
          <span className="inline-flex items-center gap-2">
            <span className={cx('chip', stageStyle(String(draft.stage)))}>{String(draft.stage)}</span>
            {stageDef && <span className="text-faint">{stageDef.probability}% · {stageDef.forecast}</span>}
          </span>
        ) : (
          `Lead · ${String(draft.leadStatus || 'New')}`
        )
      }
      footer={
        <>
          {kind === 'lead' && (
            <button className="btn mr-auto" onClick={convert} disabled={convertLead.isPending}>
              {convertLead.isPending ? <Spinner /> : <ArrowRightLeft size={14} />} Convert to Deal
            </button>
          )}
          <button className="btn text-rose-600 hover:bg-rose-50" onClick={remove}>
            <Trash2 size={14} /> Delete
          </button>
          <button className="btn btn-primary" onClick={save} disabled={!dirty || saving}>
            {saving ? <Spinner /> : null} {dirty ? 'Save changes' : 'Saved'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <EnrichPanel kind={kind} record={draft as unknown as Deal | Lead} onApply={applyEnrichment} />

        <div className="space-y-3">
          {fields.map((f) => {
            if (kind === 'deal' && DEAL_DERIVED.has(f.key)) return null;
            const opts = enumOptions(f.key);
            return (
              <div key={f.key}>
                <div className="label mb-1">{f.header}</div>
                <FieldControl
                  field={f}
                  value={draft[f.key]}
                  options={opts}
                  onChange={(v) => setField(f.key, v)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </Drawer>
  );
}

function FieldControl({
  field,
  value,
  options,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  options: string[] | null;
  onChange: (v: unknown) => void;
}) {
  if (options) {
    return (
      <select className="input" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o || '—'}
          </option>
        ))}
      </select>
    );
  }
  if (TEXTAREA_FIELDS.has(field.key)) {
    return (
      <textarea
        className="input min-h-[72px] resize-y"
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (field.type === 'date') {
    return (
      <input
        type="date"
        className="input"
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (field.type === 'number' || field.type === 'currency' || field.type === 'percent') {
    return (
      <input
        type="number"
        className="input"
        value={value == null || value === '' ? '' : Number(value)}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      />
    );
  }
  return (
    <input
      className="input"
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
