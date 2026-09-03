'use client';

const toneStyles = {
  boundary: 'bg-accent2/15 text-accent2 ring-accent2/30',
  six: 'bg-gold/20 text-gold ring-gold/40',
  danger: 'bg-danger/15 text-danger ring-danger/30',
  single: 'bg-accent/15 text-accent ring-accent/25',
  dot: 'bg-elevated text-stext ring-lborder',
};
const toneLabels = { boundary: 'Boundary', six: 'Six', danger: 'Wicket', single: 'Runs', dot: 'Dot ball' };

function ballTone(b) {
  const v = String(b);
  if (v === 'w' || v === 'W') return 'danger';
  if (v === '4') return 'boundary';
  if (v === '6') return 'six';
  const num = parseInt(v, 10);
  if (!Number.isNaN(num) && num >= 2) return 'single';
  return 'dot';
}

export default function BallTracker({ balls = [], size = 'md' }) {
  const s = size === 'lg' ? 'h-11 w-11 text-sm' : 'h-9 w-9 text-sm';
  return (
    <div className="flex flex-wrap gap-1.5">
      {balls.map((ball, i) => {
        const tone = ballTone(ball);
        return (
          <div key={i} title={toneLabels[tone]} className={`grid place-items-center rounded-lg font-bold ring-1 ring-inset ${s} ${toneStyles[tone]}`}>
            {ball}
          </div>
        );
      })}
      {!balls.length && <span className="text-sm text-stext">No balls bowled yet</span>}
    </div>
  );
}