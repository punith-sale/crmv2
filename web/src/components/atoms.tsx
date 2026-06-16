import { type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cx, stageStyle, statusStyle } from '../lib/ui';
import { initials } from '../lib/format';

export function StageChip({ stage }: { stage: string }) {
  if (!stage) return <span className="text-faint">—</span>;
  return <span className={cx('chip', stageStyle(stage))}>{stage}</span>;
}

export function StatusChip({ status }: { status: string }) {
  if (!status) return <span className="text-faint">—</span>;
  return <span className={cx('chip', statusStyle(status))}>{status}</span>;
}

export function Avatar({ name }: { name: string }) {
  if (!name || name === 'Unassigned') {
    return (
      <span className="grid h-5 w-5 place-items-center rounded-full border border-dashed border-line text-[9px] text-faint">
        ?
      </span>
    );
  }
  return (
    <span
      className="grid h-5 w-5 place-items-center rounded-full bg-accent-soft text-[9px] font-semibold text-accent"
      title={name}
    >
      {initials(name)}
    </span>
  );
}

export function Spinner({ size = 14 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin" />;
}

export function EmptyState({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: string }) {
  return (
    <div className="grid place-items-center py-20 text-center">
      <div className="mb-2 text-faint">{icon}</div>
      <div className="text-[14px] font-medium text-muted">{title}</div>
      {hint && <div className="mt-1 max-w-sm text-[12px] text-faint">{hint}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-line bg-bg px-6 py-3.5">
      <div>
        <h1 className="text-[16px] font-semibold leading-tight">{title}</h1>
        {subtitle && <p className="text-[12px] text-faint">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}
