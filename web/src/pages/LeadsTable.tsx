import { useMemo, useState } from 'react';
import { ArrowRightLeft, ChevronDown, ChevronUp, Plus, Search } from 'lucide-react';
import { useConvertLead, useLeads, useMeta } from '../api';
import { Avatar, EmptyState, PageHeader, Spinner, StatusChip } from '../components/atoms';
import { RecordDrawer } from '../components/RecordDrawer';
import { NewRecordModal } from '../components/NewRecordModal';
import type { Lead } from '../types';
import { cx } from '../lib/ui';

type SortKey = 'company' | 'leadStatus' | 'priority' | 'state' | 'icpSegment';
const CONVERT_STATUS = 'Qualified (Convert to Deal)';

export default function LeadsTable() {
  const { data: leads, isLoading } = useLeads();
  const { data: meta } = useMeta();
  const convert = useConvertLead();

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'company', dir: 1 });
  const [selected, setSelected] = useState<Lead | null>(null);
  const [creating, setCreating] = useState(false);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = (leads ?? []).filter((l) => {
      if (status && l.leadStatus !== status) return false;
      if (!q) return true;
      return [l.company, l.contact, l.email, l.notes, l.tradeFit]
        .some((v) => String(v ?? '').toLowerCase().includes(q));
    });
    out = [...out].sort((a, b) => {
      const av = a[sort.key] ?? '';
      const bv = b[sort.key] ?? '';
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * sort.dir;
      return String(av).localeCompare(String(bv)) * sort.dir;
    });
    return out;
  }, [leads, query, status, sort]);

  const selectedLive = selected ? (leads ?? []).find((l) => l._row === selected._row) ?? selected : null;

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 }));
  }

  return (
    <>
      <PageHeader
        title="Leads"
        subtitle={`${rows.length} of ${leads?.length ?? 0}`}
        actions={
          <>
            <select className="input w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {meta?.config.leadStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-faint" />
              <input
                className="input w-52 pl-7"
                placeholder="Search leads…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={() => setCreating(true)}>
              <Plus size={14} /> New lead
            </button>
          </>
        }
      />

      {isLoading ? (
        <div className="flex items-center gap-2 p-6 text-muted">
          <Spinner /> Loading leads…
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="No leads match" hint="Try clearing the search or status filter." />
      ) : (
        <div className="overflow-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead className="sticky top-0 z-10 bg-bg">
              <tr className="border-b border-line text-left text-faint">
                <Th label="Company" k="company" sort={sort} onSort={toggleSort} />
                <Th label="Status" k="leadStatus" sort={sort} onSort={toggleSort} />
                <th className="px-3 py-2 font-medium">Owner</th>
                <Th label="Segment" k="icpSegment" sort={sort} onSort={toggleSort} />
                <Th label="State" k="state" sort={sort} onSort={toggleSort} />
                <th className="px-3 py-2 font-medium">Contact</th>
                <th className="px-3 py-2 font-medium">Next step</th>
                <Th label="Pri" k="priority" sort={sort} onSort={toggleSort} />
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr
                  key={l._row}
                  onClick={() => setSelected(l)}
                  className="cursor-pointer border-b border-line/70 hover:bg-panel"
                >
                  <td className="max-w-[220px] truncate px-3 py-2 font-medium">{l.company}</td>
                  <td className="px-3 py-2">
                    <StatusChip status={l.leadStatus} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5 text-muted">
                      <Avatar name={l.owner} />
                      <span className="text-[12px]">{l.owner || '—'}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted">{l.icpSegment || '—'}</td>
                  <td className="px-3 py-2 text-muted">{l.state || '—'}</td>
                  <td className="max-w-[160px] truncate px-3 py-2 text-muted">
                    {l.contact || l.phone || l.email || '—'}
                  </td>
                  <td className="max-w-[220px] truncate px-3 py-2 text-muted">{l.nextStep || '—'}</td>
                  <td className="px-3 py-2 text-muted">{l.priority ?? '—'}</td>
                  <td className="px-3 py-2 text-right">
                    {l.leadStatus === CONVERT_STATUS && (
                      <button
                        className="btn py-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          convert.mutate({ row: l._row });
                        }}
                        disabled={convert.isPending}
                        title="Convert to deal"
                      >
                        <ArrowRightLeft size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RecordDrawer kind="lead" record={selectedLive} onClose={() => setSelected(null)} />
      <NewRecordModal kind="lead" open={creating} onClose={() => setCreating(false)} />
    </>
  );
}

function Th({
  label,
  k,
  sort,
  onSort,
}: {
  label: string;
  k: SortKey;
  sort: { key: SortKey; dir: 1 | -1 };
  onSort: (k: SortKey) => void;
}) {
  const active = sort.key === k;
  return (
    <th className="px-3 py-2 font-medium">
      <button className={cx('inline-flex items-center gap-1', active && 'text-ink')} onClick={() => onSort(k)}>
        {label}
        {active && (sort.dir === 1 ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
      </button>
    </th>
  );
}
