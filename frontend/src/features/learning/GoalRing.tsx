import { CountUp } from '../../ui';

export function GoalRing({ done, goal, size = 132 }: { done: number; goal: number; size?: number }) {
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, goal > 0 ? done / goal : 0);
  const reached = done >= goal;
  return (
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`${done} of ${goal} reviews today`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={reached ? 'var(--success)' : 'var(--accent)'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.2, 0.7, 0.2, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold tracking-tight"><CountUp value={done} /></span>
        <span className="text-xs font-medium text-muted">of {goal} today</span>
      </div>
    </div>
  );
}
