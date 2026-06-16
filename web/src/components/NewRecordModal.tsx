import { useState } from 'react';
import { Modal } from './Modal';
import { Spinner } from './atoms';
import { useCreateDeal, useCreateLead, useMeta } from '../api';

type Kind = 'deal' | 'lead';

export function NewRecordModal({
  kind,
  open,
  onClose,
}: {
  kind: Kind;
  open: boolean;
  onClose: () => void;
}) {
  const { data: meta } = useMeta();
  const createDeal = useCreateDeal();
  const createLead = useCreateLead();
  const [form, setForm] = useState<Record<string, unknown>>({});

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const pending = createDeal.isPending || createLead.isPending;
  const company = String(form.company ?? '').trim();

  async function submit() {
    if (!company) return;
    if (kind === 'deal') {
      await createDeal.mutateAsync({ stage: 'Qualifying', owner: 'Punith', ...form } as never);
    } else {
      await createLead.mutateAsync({ leadStatus: 'New', owner: 'Punith', ...form } as never);
    }
    setForm({});
    onClose();
  }

  if (!meta) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={kind === 'deal' ? 'New deal' : 'New lead'}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={!company || pending}>
            {pending ? <Spinner /> : null} Create
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Company">
          <input
            autoFocus
            className="input"
            value={String(form.company ?? '')}
            onChange={(e) => set('company', e.target.value)}
            placeholder="Acme Drywall LLC"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Owner">
            <Select value={form.owner} onChange={(v) => set('owner', v)} options={[...meta.config.owners]} />
          </Field>
          {kind === 'deal' ? (
            <Field label="Stage">
              <Select
                value={form.stage ?? 'Qualifying'}
                onChange={(v) => set('stage', v)}
                options={meta.config.stages.map((s) => s.name)}
              />
            </Field>
          ) : (
            <Field label="Status">
              <Select
                value={form.leadStatus ?? 'New'}
                onChange={(v) => set('leadStatus', v)}
                options={[...meta.config.leadStatuses]}
              />
            </Field>
          )}
        </div>

        {kind === 'deal' ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Robots (potential)">
              <input
                type="number"
                className="input"
                value={String(form.robotsPotential ?? '')}
                onChange={(e) => set('robotsPotential', e.target.value === '' ? null : Number(e.target.value))}
              />
            </Field>
            <Field label="MRR potential ($)">
              <input
                type="number"
                className="input"
                value={String(form.mrrPotential ?? '')}
                onChange={(e) => set('mrrPotential', e.target.value === '' ? null : Number(e.target.value))}
              />
            </Field>
            <Field label="Close date">
              <input
                type="date"
                className="input"
                value={String(form.closeDate ?? '')}
                onChange={(e) => set('closeDate', e.target.value)}
              />
            </Field>
            <Field label="Due">
              <input
                type="date"
                className="input"
                value={String(form.due ?? '')}
                onChange={(e) => set('due', e.target.value)}
              />
            </Field>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Field label="ICP segment">
              <Select
                value={form.icpSegment ?? ''}
                onChange={(v) => set('icpSegment', v)}
                options={['', ...meta.config.icpSegments]}
              />
            </Field>
            <Field label="State">
              <input className="input" value={String(form.state ?? '')} onChange={(e) => set('state', e.target.value)} />
            </Field>
            <Field label="Contact">
              <input className="input" value={String(form.contact ?? '')} onChange={(e) => set('contact', e.target.value)} />
            </Field>
            <Field label="Phone">
              <input className="input" value={String(form.phone ?? '')} onChange={(e) => set('phone', e.target.value)} />
            </Field>
            <Field label="Email">
              <input className="input" value={String(form.email ?? '')} onChange={(e) => set('email', e.target.value)} />
            </Field>
            <Field label="Trade fit">
              <input className="input" value={String(form.tradeFit ?? '')} onChange={(e) => set('tradeFit', e.target.value)} />
            </Field>
          </div>
        )}

        <Field label="Next step">
          <input className="input" value={String(form.nextStep ?? '')} onChange={(e) => set('nextStep', e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="label mb-1">{label}</div>
      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: unknown;
  onChange: (v: string) => void;
  options: string[];
}) {
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
