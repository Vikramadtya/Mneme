import { Moon, Sun } from 'lucide-react';
import { useTheme } from './theme';

export function ThemeToggle() {
  const { cycle } = useTheme();
  return (
    <button onClick={cycle} aria-label="Toggle dark mode" title="Toggle dark mode" className="relative rounded-xl p-2 text-muted transition hover:bg-surface-2 hover:text-fg">
      <Sun className="h-5 w-5 dark:hidden" />
      <Moon className="hidden h-5 w-5 dark:block" />
    </button>
  );
}
