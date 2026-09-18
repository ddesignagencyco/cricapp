import { asPercent } from '../../lib/predictions';

interface Props {
  homeLabel: string;
  awayLabel: string;
  homeWinProb: number;
  awayWinProb: number;
  compact?: boolean;
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
  const homeBar = even ? 'bg-success' : homeHigh ? 'bg-success' : 'bg-danger';
  const awayBar = even ? 'bg-danger' : homeHigh ? 'bg-danger' : 'bg-success';

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
      <div className="flex h-2.5 overflow-hidden rounded-full bg-secondary ring-1 ring-lborder">
        <div className={`h-full transition-all ${homeBar}`} style={{ width: `${home}%` }} />
        <div className={`h-full transition-all ${awayBar}`} style={{ width: `${away}%` }} />
      </div>
    </div>
  );
}
