import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { BarChart3, BookOpen, CornerDownLeft, Layers, LayoutDashboard, LogOut, Moon, Play, Plus, Search, Settings as SettingsIcon, Upload } from 'lucide-react';
import { signOut } from '../../api/auth';
import { useMyVocabulary } from '../../features/vocabulary/api';
import { cx } from '../../ui';
import { useTheme } from '../../ui/theme';

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { cycle } = useTheme();
  const { data: words } = useMyVocabulary();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const commands = useMemo<Command[]>(() => {
    const go = (path: string) => () => navigate(path);
    const base: Command[] = [
      { id: 'session', label: 'Start review session', icon: <Play className="h-4 w-4" />, run: go('/session') },
      { id: 'add', label: 'Add a word', icon: <Plus className="h-4 w-4" />, run: go('/vocabulary?addWord=true') },
      { id: 'import', label: 'Import words from a list or file', icon: <Upload className="h-4 w-4" />, run: go('/vocabulary?import=true') },
      { id: 'home', label: 'Go to Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, run: go('/') },
      { id: 'vocab', label: 'Go to Vocabulary', icon: <BookOpen className="h-4 w-4" />, run: go('/vocabulary') },
      { id: 'collections', label: 'Go to Collections', icon: <Layers className="h-4 w-4" />, run: go('/collections') },
      { id: 'insights', label: 'Go to Insights', icon: <BarChart3 className="h-4 w-4" />, run: go('/insights') },
      { id: 'settings', label: 'Go to Settings', icon: <SettingsIcon className="h-4 w-4" />, run: go('/settings') },
      { id: 'theme', label: 'Toggle dark mode', icon: <Moon className="h-4 w-4" />, run: cycle },
      { id: 'out', label: 'Sign out', icon: <LogOut className="h-4 w-4" />, run: signOut },
    ];
    const q = query.trim().toLowerCase();
    if (!q) return base;
    const matchingWords = (words ?? [])
      .filter((w) => w.word.toLowerCase().includes(q))
      .slice(0, 6)
      .map<Command>((w) => ({
        id: `word-${w.id}`,
        label: w.word,
        hint: w.definitions?.[0],
        icon: <Search className="h-4 w-4" />,
        run: go(`/vocabulary/${w.id}`),
      }));
    return [...matchingWords, ...base.filter((c) => c.label.toLowerCase().includes(q))];
  }, [query, words, navigate, cycle]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setTimeout(() => input.current?.focus(), 0);
    }
  }, [open]);
  useEffect(() => setActive(0), [query]);

  if (!open) return null;

  const run = (c?: Command) => {
    if (!c) return;
    onClose();
    c.run();
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={onClose} />
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-pop animate-in zoom-in-95 fade-in duration-150"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
          else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, commands.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          else if (e.key === 'Enter') run(commands[active]);
        }}
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-5 w-5 text-muted" />
          <input ref={input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search words or type a command…" className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted" aria-label="Search" />
          <kbd className="rounded-md border border-line px-1.5 py-0.5 text-[11px] text-muted">esc</kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto p-2" role="listbox">
          {commands.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">Nothing matches “{query}”.</li>}
          {commands.map((c, i) => (
            <li key={c.id} role="option" aria-selected={i === active}>
              <button onMouseEnter={() => setActive(i)} onClick={() => run(c)} className={cx('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm', i === active ? 'bg-accent-soft text-accent' : 'text-fg')}>
                <span className="text-muted">{c.icon}</span>
                <span className="flex-1 truncate font-medium">{c.label}</span>
                {c.hint && <span className="hidden max-w-[40%] truncate text-xs text-muted sm:block">{c.hint}</span>}
                {i === active && <CornerDownLeft className="h-3.5 w-3.5" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
