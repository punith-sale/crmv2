import { type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Cloud,
  CloudOff,
  LayoutDashboard,
  Plug,
  Target,
  Users,
} from 'lucide-react';
import { useMeta } from '../api';
import { cx } from '../lib/ui';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/deals', label: 'Deals', icon: Target },
  { to: '/leads', label: 'Leads', icon: Users },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { data: meta } = useMeta();

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-line bg-panel">
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-ink text-[13px] font-bold text-white">
            O
          </div>
          <div className="leading-tight">
            <div className="text-[13px] font-semibold">Origin CRM</div>
            <div className="text-[11px] text-faint">Sales pipeline</div>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5 px-2 py-2">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cx(
                  'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors',
                  isActive ? 'bg-accent-soft text-accent' : 'text-ink hover:bg-line/60',
                )
              }
            >
              <Icon size={16} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-2 px-3 py-3 text-[11px] text-faint">
          {meta?.plugins?.length ? (
            <div className="flex items-center gap-1.5">
              <Plug size={12} />
              {meta.plugins.length} plugin{meta.plugins.length > 1 ? 's' : ''} loaded
            </div>
          ) : null}
          <div className="flex items-center gap-1.5">
            {meta?.authorized ? (
              <>
                <Cloud size={12} className="text-emerald-500" />
                <span>Synced · {meta.tabs?.deals ?? 'Deals'}/{meta.tabs?.leads ?? 'Leads'}</span>
              </>
            ) : (
              <>
                <CloudOff size={12} className="text-rose-500" />
                <span>Not connected</span>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {meta && !meta.authorized && <AuthBanner />}
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  );
}

function AuthBanner() {
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-6 py-2.5 text-[12px] text-amber-800">
      <span className="font-semibold">Google Sheets not connected.</span> Run{' '}
      <code className="rounded bg-amber-100 px-1 py-0.5">npm run auth</code> in the project
      directory to sign in and link your spreadsheet, then refresh.
    </div>
  );
}
