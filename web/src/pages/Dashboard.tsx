import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRightLeft, Clock, RefreshCw } from 'lucide-react';
import { useConvertLead, useDashboard } from '../api';
import { PageHeader, Spinner, StageChip } from '../components/atoms';
import { dateLabel, money } from '../lib/format';
import { cx } from '../lib/ui';

export default function Dashboard() {
  const { data, isLoading, isFetching, refetch } = useDashboard();
  const convert = useConvertLead();

  if (isLoading || !data) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <div className="flex items-center gap-2 p-6 text-muted">
          <Spinner /> Loading pipeline…
        </div>
      </>
    );
  }

  const k = data.kpis;
  const tiles = [
    { label: 'MRR Signed', value: money(k.mrrSigned, true), tone: 'text-emerald-600' },
    { label: 'ARR Signed', value: money(k.arrSigned, true), tone: 'text-emerald-600' },
    { label: 'Open Pipeline MRR', value: money(k.openPipelineMrr, true) },
    { label: 'ARR Potential (open)', value: money(k.arrPotentialOpen, true) },
    { label: 'Commit MRR', value: money(k.commitMrr, true), tone: 'text-amber-600' },
    { label: 'Best Case MRR', value: money(k.bestCaseMrr, true), tone: 'text-violet-600' },
    { label: 'Open Deals', value: String(k.openDeals) },
    { label: 'Robots Signed', value: String(k.robotsSigned) },
  ];

  const maxStageMrr = Math.max(1, ...data.byStage.map((s) => s.mrrPotential));

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Live from your Google Sheet"
        actions={
          <button className="btn" onClick={() => refetch()}>
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} /> Refresh
          </button>
        }
      />

      <div className="space-y-6 p-6">
        {/* KPI tiles */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {tiles.map((t) => (
            <div key={t.label} className="card px-4 py-3">
              <div className="label">{t.label}</div>
              <div className={cx('mt-1 text-[22px] font-semibold tracking-tight', t.tone)}>
                {t.value}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Pipeline by stage */}
          <div className="card lg:col-span-2">
            <div className="border-b border-line px-4 py-2.5 text-[13px] font-semibold">
              Pipeline by stage
            </div>
            <div className="divide-y divide-line">
              {data.byStage.map((s) => (
                <div key={s.stage} className="flex items-center gap-4 px-4 py-2.5">
                  <div className="w-28 shrink-0">
                    <StageChip stage={s.stage} />
                  </div>
                  <div className="w-16 shrink-0 text-[12px] text-muted">{s.deals} deals</div>
                  <div className="w-20 shrink-0 text-[12px] text-muted">{s.robotsPotential} robots</div>
                  <div className="flex flex-1 items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-line">
                      <div
                        className="h-1.5 rounded-full bg-accent"
                        style={{ width: `${(s.mrrPotential / maxStageMrr) * 100}%` }}
                      />
                    </div>
                    <div className="w-16 text-right text-[12px] font-medium tabular-nums">
                      {money(s.mrrPotential, true)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Leads to convert */}
          <div className="card">
            <div className="flex items-center gap-1.5 border-b border-line px-4 py-2.5 text-[13px] font-semibold">
              <ArrowRightLeft size={14} className="text-emerald-600" /> Conversion queue
            </div>
            <div className="divide-y divide-line">
              {data.needsAttention.leadsToConvert.length === 0 && (
                <div className="px-4 py-4 text-[12px] text-faint">No leads waiting to convert.</div>
              )}
              {data.needsAttention.leadsToConvert.map((l) => (
                <div key={l._row} className="flex items-center justify-between gap-2 px-4 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium">{l.company}</div>
                    <div className="text-[11px] text-faint">{l.icpSegment || l.tradeFit || 'Lead'}</div>
                  </div>
                  <button
                    className="btn shrink-0 py-1"
                    onClick={() => convert.mutate({ row: l._row })}
                    disabled={convert.isPending}
                  >
                    Convert
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Needs attention */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <AttentionList
            icon={<AlertTriangle size={14} className="text-rose-500" />}
            title={`Overdue next step (${data.needsAttention.overdue.length})`}
            empty="Nothing overdue. Nice."
            items={data.needsAttention.overdue.map((d) => ({
              key: d._row,
              company: d.company,
              meta: `Due ${dateLabel(d.due)}`,
              detail: d.nextStep,
            }))}
          />
          <AttentionList
            icon={<Clock size={14} className="text-amber-500" />}
            title={`Neglected 30+ days (${data.needsAttention.neglected.length})`}
            empty="All deals have recent activity."
            items={data.needsAttention.neglected.map((d) => ({
              key: d._row,
              company: d.company,
              meta: d.daysSinceActivity != null ? `${d.daysSinceActivity}d quiet` : 'No activity logged',
              detail: d.nextStep,
            }))}
          />
        </div>
      </div>
    </>
  );
}

function AttentionList({
  icon,
  title,
  empty,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  empty: string;
  items: { key: number; company: string; meta: string; detail?: string }[];
}) {
  return (
    <div className="card">
      <div className="flex items-center gap-1.5 border-b border-line px-4 py-2.5 text-[13px] font-semibold">
        {icon} {title}
      </div>
      <div className="max-h-72 divide-y divide-line overflow-auto">
        {items.length === 0 && <div className="px-4 py-4 text-[12px] text-faint">{empty}</div>}
        {items.map((it) => (
          <Link
            to="/deals"
            key={it.key}
            className="block px-4 py-2 hover:bg-panel"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[13px] font-medium">{it.company}</span>
              <span className="shrink-0 text-[11px] text-faint">{it.meta}</span>
            </div>
            {it.detail && <div className="truncate text-[12px] text-muted">{it.detail}</div>}
          </Link>
        ))}
      </div>
    </div>
  );
}
