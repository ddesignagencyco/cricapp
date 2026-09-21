import { asPercent } from '../../lib/predictions';

interface Props {
  homeLabel: string;
  awayLabel: string;
  homeWinProb: number;
  awayWinProb: number;
  compact?: boolean;
}

function Segment({
  share,
  tone,
  label,
  compact,
}: {
  share: number;
  tone: string;
  label: string;
  compact: boolean;
}) {
  if (share <= 0) return null;
  const small = share < 50;
  return (
    <div
      className={`flex h-full items-center justify-center overflow-hidden px-2 ${tone}`}
      style={{
        flexGrow: share,
        flexShrink: small ? 0 : 1,
        flexBasis: '3.25rem',
        minWidth: '3.25rem',
      }}
    >
      <span
        className={`font-mono font-black tabular-nums text-[var(--color-card)] ${
          compact ? 'text-[11px]' : 'text-xs'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

export function WinSplitBar({
  homeWinProb,
  awayWinProb,
  compact = false,
}: {
  homeWinProb: number;
  awayWinProb: number;
  compact?: boolean;
}) {
  const home = Math.max(0, Math.min(100, Number(homeWinProb) * 100));
  const away = Math.max(0, Math.min(100, Number(awayWinProb) * 100));
  const even = home === away;
  const homeHigh = home > away;
  const homeBar = even ? 'bg-success' : homeHigh ? 'bg-success' : 'bg-danger';
  const awayBar = even ? 'bg-danger' : homeHigh ? 'bg-danger' : 'bg-success';

  return (
    <div className={`flex w-full overflow-hidden rounded-full ${compact ? 'h-8' : 'h-10'}`}>
      <Segment share={home} tone={homeBar} label={asPercent(homeWinProb)} compact={compact} />
      <Segment share={away} tone={awayBar} label={asPercent(awayWinProb)} compact={compact} />
    </div>
  );
}

export default function WinProbabilityBar({
  homeLabel,
  awayLabel,
  homeWinProb,
  awayWinProb,
  compact = false,
}: Props) {
  const home = Math.max(0, Math.min(100, Number(homeWinProb) * 100));
  const away = Math.max(0, Math.min(100, Number(awayWinProb) * 100));
  const even = home === away;
  const homeHigh = home > away;
  const homeTone = even ? 'text-mtext' : homeHigh ? 'text-success' : 'text-danger';
  const awayTone = even ? 'text-mtext' : homeHigh ? 'text-danger' : 'text-success';

  return (
    <div>
      <div className={`flex items-end justify-between gap-3 ${compact ? 'mb-1.5' : 'mb-2.5'}`}>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-stext">{homeLabel}</p>
          <p className={`font-mono font-black tabular-nums ${homeTone} ${compact ? 'text-lg' : 'text-2xl sm:text-3xl'}`}>
            {asPercent(homeWinProb)}
          </p>
        </div>
        <div className="min-w-0 text-right">
          <p className="truncate text-xs font-semibold text-stext">{awayLabel}</p>
          <p className={`font-mono font-black tabular-nums ${awayTone} ${compact ? 'text-lg' : 'text-2xl sm:text-3xl'}`}>
            {asPercent(awayWinProb)}
          </p>
        </div>
      </div>
      <WinSplitBar homeWinProb={homeWinProb} awayWinProb={awayWinProb} compact={compact} />
    </div>
  );
}
