import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { Plus, Search } from 'lucide-react';
import { useDeals, useMeta, useUpdateDeal } from '../api';
import { Avatar, PageHeader, Spinner } from '../components/atoms';
import { RecordDrawer } from '../components/RecordDrawer';
import { NewRecordModal } from '../components/NewRecordModal';
import type { Deal } from '../types';
import { dateLabel, money, relativeDays, daysFromToday } from '../lib/format';
import { cx, STAGE_DOT } from '../lib/ui';

export default function DealsBoard() {
  const { data: deals, isLoading } = useDeals();
  const { data: meta } = useMeta();
  const updateDeal = useUpdateDeal();

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Deal | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const stages = meta?.config.stages.map((s) => s.name) ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (deals ?? []).filter((d) => !q || d.company.toLowerCase().includes(q));
  }, [deals, query]);

  const byStage = useMemo(() => {
    const map: Record<string, Deal[]> = {};
    for (const s of stages) map[s] = [];
    for (const d of filtered) (map[d.stage] ??= []).push(d);
    return map;
  }, [filtered, stages]);

  // Keep the selected drawer record fresh after refetches.
  const selectedLive = selected ? (deals ?? []).find((d) => d._row === selected._row) ?? selected : null;
  const activeDeal = activeId != null ? (deals ?? []).find((d) => d._row === activeId) ?? null : null;

  function onDragStart(e: DragStartEvent) {
    setActiveId(Number(e.active.id));
  }
  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const overStage = e.over?.id ? String(e.over.id) : null;
    const row = Number(e.active.id);
    const deal = (deals ?? []).find((d) => d._row === row);
    if (!deal || !overStage || deal.stage === overStage) return;
    updateDeal.mutate({ row, body: { stage: overStage } });
  }

  return (
    <>
      <PageHeader
        title="Deals"
        subtitle={`${filtered.length} deal${filtered.length === 1 ? '' : 's'}`}
        actions={
          <>
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-faint" />
              <input
                className="input w-52 pl-7"
                placeholder="Search deals…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={() => setCreating(true)}>
              <Plus size={14} /> New deal
            </button>
          </>
        }
      />

      {isLoading ? (
        <div className="flex items-center gap-2 p-6 text-muted">
          <Spinner /> Loading deals…
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <div className="flex h-full gap-3 overflow-x-auto p-4">
            {stages.map((stage) => (
              <Column
                key={stage}
                stage={stage}
                deals={byStage[stage] ?? []}
                onOpen={setSelected}
              />
            ))}
          </div>
          <DragOverlay>{activeDeal ? <Card deal={activeDeal} dragging /> : null}</DragOverlay>
        </DndContext>
      )}

      <RecordDrawer kind="deal" record={selectedLive} onClose={() => setSelected(null)} />
      <NewRecordModal kind="deal" open={creating} onClose={() => setCreating(false)} />
    </>
  );
}

function Column({
  stage,
  deals,
  onOpen,
}: {
  stage: string;
  deals: Deal[];
  onOpen: (d: Deal) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const totalMrr = deals.reduce((s, d) => s + (d.mrrPotential ?? 0), 0);

  return (
    <div className="flex w-[280px] shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={cx('h-2 w-2 rounded-full', STAGE_DOT[stage] ?? 'bg-zinc-400')} />
          <span className="text-[13px] font-semibold">{stage}</span>
          <span className="text-[12px] text-faint">{deals.length}</span>
        </div>
        <span className="text-[11px] text-faint">{money(totalMrr, true)}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cx(
          'flex min-h-[120px] flex-1 flex-col gap-2 rounded-md p-1 transition-colors',
          isOver ? 'bg-accent-soft' : 'bg-panel/60',
        )}
      >
        {deals.map((d) => (
          <DraggableCard key={d._row} deal={d} onOpen={onOpen} />
        ))}
        {deals.length === 0 && (
          <div className="grid place-items-center py-6 text-[11px] text-faint">Drop here</div>
        )}
      </div>
    </div>
  );
}

function DraggableCard({ deal, onOpen }: { deal: Deal; onOpen: (d: Deal) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: deal._row });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(deal)}
      className={cx('cursor-pointer', isDragging && 'opacity-30')}
    >
      <Card deal={deal} />
    </div>
  );
}

function Card({ deal, dragging }: { deal: Deal; dragging?: boolean }) {
  const overdue = (daysFromToday(deal.due) ?? -1) > 0;
  return (
    <div className={cx('card px-3 py-2.5', dragging && 'shadow-pop')}>
      <div className="flex items-start justify-between gap-2">
        <div className="truncate text-[13px] font-medium">{deal.company}</div>
        <Avatar name={deal.owner} />
      </div>
      <div className="mt-1.5 flex items-center gap-3 text-[12px] text-muted">
        {deal.mrrPotential != null && (
          <span className="font-medium text-ink">{money(deal.mrrPotential, true)}</span>
        )}
        {deal.robotsPotential != null && <span>{deal.robotsPotential} robots</span>}
      </div>
      {deal.nextStep && (
        <div className="mt-1.5 line-clamp-2 text-[12px] text-muted">{deal.nextStep}</div>
      )}
      {deal.due && (
        <div className={cx('mt-1.5 text-[11px]', overdue ? 'font-medium text-rose-600' : 'text-faint')}>
          {overdue ? 'Overdue · ' : 'Due '} {dateLabel(deal.due)} ({relativeDays(deal.due)})
        </div>
      )}
    </div>
  );
}
