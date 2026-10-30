import { useEffect, useId, useRef, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';
import { useCountUp } from './hooks';

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

/* ---------- Button ---------- */
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
};

const buttonVariants = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover shadow-card',
  secondary: 'bg-surface text-fg border border-line hover:bg-surface-2',
  soft: 'bg-accent-soft text-accent hover:brightness-95',
  ghost: 'text-muted hover:text-fg hover:bg-surface-2',
  danger: 'bg-danger text-white hover:brightness-110',
};
const buttonSizes = { sm: 'h-8 px-3 text-sm rounded-lg', md: 'h-10 px-4 text-sm rounded-xl', lg: 'h-12 px-6 text-base rounded-2xl' };

export const buttonClass = (variant: keyof typeof buttonVariants = 'primary', size: keyof typeof buttonSizes = 'md', extra?: string) =>
  cx(
    'inline-flex items-center justify-center gap-2 font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none whitespace-nowrap',
    buttonVariants[variant],
    buttonSizes[size],
    extra,
  );

export function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button className={buttonClass(variant, size, className)} disabled={disabled || loading} {...rest}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

/* ---------- Surfaces ---------- */
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('rounded-[var(--radius-card)] border border-line bg-surface shadow-card', className)} {...rest} />;
}

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
const tones: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-muted',
  accent: 'bg-accent-soft text-accent',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
};
export function Badge({ tone = 'neutral', className, ...rest }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={cx('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide', tones[tone], className)} {...rest} />;
}

/* ---------- Form controls ---------- */
const field =
  'w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-fg placeholder:text-muted/70 transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 disabled:opacity-60';

export function Field({ label, hint, children }: { label: string; hint?: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-fg">
        {label}
      </label>
      {children(id)}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(field, 'h-10', className)} {...rest} />;
}
export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(field, 'py-2.5', className)} {...rest} />;
}
export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(field, 'h-10 cursor-pointer pr-8', className)} {...rest}>
      {children}
    </select>
  );
}

/* ---------- Feedback ---------- */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx('skeleton rounded-xl', className)} />;
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cx('h-5 w-5 animate-spin text-accent', className)} aria-label="Loading" />;
}

export function EmptyState({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">{icon}</div>
      <h3 className="text-lg font-bold">{title}</h3>
      {children && <p className="mt-1 max-w-sm text-sm text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cx('h-1.5 w-full overflow-hidden rounded-full bg-surface-2', className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

/** A number that counts up when it first appears. */
export function CountUp({ value, suffix = '' }: { value: number; suffix?: string }) {
  const shown = useCountUp(value);
  return <span className="tabular">{shown}{suffix}</span>;
}

export function Stat({ icon, label, value, suffix, tone = 'accent', loading }: { icon: ReactNode; label: string; value: number; suffix?: string; tone?: Tone; loading?: boolean }) {
  return (
    <Card className="flex items-center gap-3 p-4 sm:gap-4 sm:p-5">
      <div className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11', tones[tone])}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium leading-tight text-muted">{label}</p>
        {loading ? <Skeleton className="mt-1 h-7 w-14" /> : <p className="text-2xl font-extrabold tracking-tight"><CountUp value={value} suffix={suffix} /></p>}
      </div>
    </Card>
  );
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, children, size = 'md' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panel.current) {
        const focusable = panel.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    panel.current?.querySelector<HTMLElement>('input, textarea, select')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  const width = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }[size];
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={onClose} />
      <div ref={panel} role="dialog" aria-modal="true" aria-label={title} className={cx('relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-line bg-surface shadow-pop animate-in slide-in-from-bottom-6 fade-in duration-200 sm:rounded-3xl', width)}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface/90 px-6 py-4 backdrop-blur">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-fg">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onClose, loading }: { open: boolean; title: string; message: string; confirmLabel?: string; onConfirm: () => void; onClose: () => void; loading?: boolean }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm leading-relaxed text-muted">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

/* ---------- Segmented control ---------- */
export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx('rounded-lg px-3 py-1.5 text-sm font-medium transition', value === o.value ? 'bg-surface text-fg shadow-card' : 'text-muted hover:text-fg')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
