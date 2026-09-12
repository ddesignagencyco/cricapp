'use client';

const toneStyles: Record<string, string> = {
  boundary: 'bg-accent2/15 text-accent2 ring-accent2/30',
  six: 'bg-gold/20 text-gold ring-gold/40',
  danger: 'bg-danger/15 text-danger ring-danger/30',
  extra: 'bg-accent/10 text-accent ring-accent/25',
  single: 'bg-accent/15 text-accent ring-accent/25',
  dot: 'bg-elevated text-stext ring-lborder',
  empty: 'bg-transparent text-transparent ring-lborder/70',
};
const toneLabels: Record<string, string> = {
  boundary: 'Boundary',
  six: 'Six',
  danger: 'Wicket',
  extra: 'Extra',
  single: 'Runs',
  dot: 'Dot ball',
  empty: 'Yet to be bowled',
};

function ballTone(ball: string | number | null): string {
  if (ball == null || ball === '') return 'empty';
  const value = String(ball);
  if (value === 'w' || value === 'W') return 'danger';
  if (value === 'Wd' || value === 'Nb') return 'extra';
  if (value === '4') return 'boundary';
  if (value === '6') return 'six';
  const num = parseInt(value, 10);
  if (!Number.isNaN(num) && num >= 1) return 'single';
  return 'dot';
}

interface BallTrackerProps {
  balls?: (string | number | null)[];
  size?: string;
}

export default function BallTracker({ balls = [], size = 'md' }: BallTrackerProps) {
  const s = size === 'lg' ? 'h-11 w-11 text-sm' : 'h-9 w-9 text-sm';
  if (!balls.length) {
    return <span className="text-sm text-stext">This over fills as each ball is bowled.</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {balls.map((ball, i) => {
        const tone = ballTone(ball);
        return (
          <div
            key={i}
            title={toneLabels[tone]}
            className={`grid place-items-center rounded-lg font-bold ring-1 ring-inset ${s} ${toneStyles[tone]}`}
          >
            {ball == null ? '' : ball}
          </div>
        );
      })}
    </div>
  );
}
