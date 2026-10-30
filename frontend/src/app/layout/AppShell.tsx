import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { BarChart3, BookOpen, Command, Layers, LayoutDashboard, Settings, WifiOff } from 'lucide-react';
import { cx } from '../../ui';
import { ThemeToggle } from '../../ui/ThemeToggle';
import { useOnlineStatus } from '../../ui/hooks';
import { CommandPalette } from './CommandPalette';

const NAV = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/vocabulary', label: 'Words', icon: BookOpen },
  { to: '/collections', label: 'Collections', icon: Layers },
  { to: '/insights', label: 'Insights', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

export function AppShell() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const online = useOnlineStatus();
  const { pathname } = useLocation();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const link = ({ isActive }: { isActive: boolean }) =>
    cx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition', isActive ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-surface-2 hover:text-fg');

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
        <div className="mb-8 flex items-center gap-3 px-2">
          <img src="/brain-svgrepo-com.svg" alt="" className="h-9 w-9" />
          <span className="text-xl font-extrabold tracking-tight">Memoriser</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={link} viewTransition>
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <button onClick={() => setPaletteOpen(true)} className="mb-3 flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm text-muted transition hover:bg-surface-2">
          <Command className="h-4 w-4" />
          <span className="flex-1 text-left">Quick search</span>
          <kbd className="rounded border border-line px-1.5 text-[11px]">{isMac ? '⌘' : 'Ctrl'} K</kbd>
        </button>
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-muted">Appearance</span>
          <ThemeToggle />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/85 px-4 py-3 backdrop-blur lg:hidden" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-2">
          <img src="/brain-svgrepo-com.svg" alt="" className="h-7 w-7" />
          <span className="text-lg font-extrabold tracking-tight">Memoriser</span>
        </div>
        <div className="flex items-center">
          <button onClick={() => setPaletteOpen(true)} aria-label="Search" className="rounded-xl p-2 text-muted hover:bg-surface-2 hover:text-fg">
            <Command className="h-5 w-5" />
          </button>
          <ThemeToggle />
        </div>
      </header>

      {!online && (
        <div className="flex items-center justify-center gap-2 bg-warning-soft px-4 py-2 text-sm font-medium text-warning" role="status">
          <WifiOff className="h-4 w-4" /> You are offline. Reviews are saved and will sync when you reconnect.
        </div>
      )}

      <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-10">
        <div key={pathname} className="page-enter">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 backdrop-blur lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink to={to} end={end} viewTransition className={({ isActive }) => cx('flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition', isActive ? 'text-accent' : 'text-muted')}>
                <Icon className="h-6 w-6" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
