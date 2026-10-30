import { useEffect, useMemo, useRef } from 'react';
import type { HeatmapDay } from '../analytics/api';

const LEVELS = ['var(--surface-2)', 'color-mix(in srgb, var(--accent) 28%, var(--surface-2))', 'color-mix(in srgb, var(--accent) 50%, var(--surface-2))', 'color-mix(in srgb, var(--accent) 75%, var(--surface-2))', 'var(--accent)'];

function levelFor(count: number, max: number) {
  if (count <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((count / Math.max(max, 1)) * 4)));
}

/** GitHub-style grid of review activity; `weeks` limits how far back it goes. */
export function Heatmap({ days, weeks }: { days: HeatmapDay[]; weeks?: number }) {
  const scroller = useRef<HTMLDivElement>(null);

  const { cells, months } = useMemo(() => {
    const visible = weeks ? days.slice(-weeks * 7) : days;
    const max = Math.max(0, ...visible.map((d) => d.count));
    // Pad so the first column starts on a Sunday and rows line up with weekdays.
    const first = visible[0] ? new Date(`${visible[0].date}T12:00:00`).getDay() : 0;
    const padded = [...Array.from({ length: first }, () => null), ...visible];
    const monthLabels: { col: number; label: string }[] = [];
    visible.forEach((d, i) => {
      const date = new Date(`${d.date}T12:00:00`);
      if (date.getDate() <= 7 && date.getDay() === 0) {
        monthLabels.push({ col: Math.floor((i + first) / 7), label: date.toLocaleDateString(undefined, { month: 'short' }) });
      }
    });
    return { cells: padded.map((d) => (d ? { ...d, level: levelFor(d.count, max) } : null)), months: monthLabels };
  }, [days, weeks]);

  useEffect(() => {
    scroller.current?.scrollTo({ left: scroller.current.scrollWidth });
  }, [cells.length]);

  const columns = Math.ceil(cells.length / 7);
  return (
    <div ref={scroller} className="overflow-x-auto pb-1">
      <div className="inline-block min-w-full">
        <div className="relative mb-1 h-4 text-[11px] text-muted" style={{ width: columns * 16 }}>
          {months.map((m) => (
            <span key={`${m.col}-${m.label}`} className="absolute" style={{ left: m.col * 16 }}>{m.label}</span>
          ))}
        </div>
        <div className="grid grid-flow-col grid-rows-7 gap-[3px]" style={{ gridTemplateColumns: `repeat(${columns}, 13px)` }} role="img" aria-label="Review activity by day">
          {cells.map((d, i) =>
            d ? (
              <div key={d.date} title={`${d.count} ${d.count === 1 ? 'review' : 'reviews'} on ${new Date(`${d.date}T12:00:00`).toLocaleDateString(undefined, { dateStyle: 'medium' })}`} className="h-[13px] w-[13px] rounded-[3px]" style={{ background: LEVELS[d.level] }} />
            ) : (
              <div key={`pad-${i}`} />
            ),
          )}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1.5 text-[11px] text-muted">
        Less
        {LEVELS.map((c, i) => (
          <span key={i} className="h-[11px] w-[11px] rounded-[3px]" style={{ background: c }} />
        ))}
        More
      </div>
    </div>
  );
}
