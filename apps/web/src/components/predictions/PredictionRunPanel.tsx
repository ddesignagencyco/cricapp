import Badge from '../Badge';
import TeamLogo from '../TeamLogo';
import WinProbabilityBar from './WinProbabilityBar';
import {
  asPercent,
  bandTone,
  explanationReasons,
  favoriteLabel,
  isNil,
  stageLabel,
  xiNames,
} from '../../lib/predictions';
import type { MatchSideLabels, PredictionPlayerPick, PredictionRun } from '../../types/predictions';
import { formatScheduled } from '../../utils/helpers';

interface Props {
  run: PredictionRun;
  sides: MatchSideLabels;
}

function playerName(player: PredictionPlayerPick): string {
  return String(player.playerName || player.name || 'Player');
}

function PlayerList({ title, players }: { title: string; players: PredictionPlayerPick[] }) {
  if (players.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-stext">{title}</p>
      <ul className="space-y-1.5">
        {players.slice(0, 5).map((player, index) => (
          <li key={`${playerName(player)}-${index}`} className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-semibold text-mtext">{playerName(player)}</span>
            {!isNil(player.probability) && (
              <span className="font-mono text-xs font-bold text-accent">{asPercent(Number(player.probability))}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PredictionRunPanel({ run, sides }: Props) {
  const { date, time } = formatScheduled(run.createdAt);
  const reasons = explanationReasons(run.explanation);
  const range = run.scoreRange;
  const homeXi = xiNames(run.xi, 'home');
  const awayXi = xiNames(run.xi, 'away');
  const partnership = run.partnershipProjection;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={run.stage === 'live' ? 'warning' : 'primary'}>{stageLabel(run.stage)}</Badge>
          <Badge tone={bandTone(run.calibrationBand)}>{run.calibrationBand} confidence</Badge>
        </div>
        <p className="text-xs text-stext">
          {date} {time} · {run.modelVersion}
        </p>
      </div>

      <WinProbabilityBar
        homeLabel={sides.homeName}
        awayLabel={sides.awayName}
        homeWinProb={run.homeWinProb}
        awayWinProb={run.awayWinProb}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Favorite" value={favoriteLabel(run, sides)} />
        <Stat label="Model confidence" value={asPercent(run.confidence)} />
        {!isNil(run.momentum) && <Stat label="Momentum" value={run.momentum.toFixed(2)} />}
        {!isNil(run.pressureIndex) && <Stat label="Pressure" value={asPercent(run.pressureIndex)} />}
        {!isNil(run.wicketRisk) && <Stat label="Wicket risk" value={asPercent(run.wicketRisk)} />}
      </div>

      {range && (!isNil(range.expected) || !isNil(range.low)) && (
        <div className="rounded-2xl bg-secondary/70 p-4 ring-1 ring-lborder">
          <p className="text-xs font-bold uppercase tracking-widest text-stext">
            {String(range.type || 'score range').replace(/_/g, ' ')}
          </p>
          <p className="mt-1 font-mono text-xl font-black text-mtext">
            {range.low ?? '—'} – {range.high ?? '—'}
            <span className="ml-2 text-sm font-semibold text-accent">exp {range.expected ?? '—'}</span>
            {range.unit ? <span className="ml-1 text-xs text-stext">{range.unit}</span> : null}
          </p>
        </div>
      )}

      {partnership && !isNil(partnership.expectedAdditionalRuns) && (
        <p className="text-sm text-stext">
          Partnership projection: <span className="font-semibold text-mtext">{partnership.expectedAdditionalRuns} runs</span>
          {!isNil(partnership.horizonBalls) ? ` over the next ${partnership.horizonBalls} balls` : ''}.
        </p>
      )}

      {reasons.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-stext">Why this lean</p>
          <ul className="space-y-1.5">
            {reasons.map((reason) => (
              <li key={reason} className="rounded-xl bg-secondary/60 px-3 py-2 text-sm text-mtext ring-1 ring-lborder/60">
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <PlayerList title="Top batters" players={run.topBatters || []} />
        <PlayerList title="Top bowlers" players={run.topBowlers || []} />
      </div>

      {(homeXi.length > 0 || awayXi.length > 0) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <XiList label={sides.homeName} code={sides.homeCode} names={homeXi} />
          <XiList label={sides.awayName} code={sides.awayCode} names={awayXi} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card p-3 ring-1 ring-lborder">
      <p className="text-[11px] font-bold uppercase tracking-widest text-stext">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-mtext">{value}</p>
    </div>
  );
}

function XiList({ label, code, names }: { label: string; code: string; names: string[] }) {
  if (names.length === 0) return null;
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-lborder">
      <div className="mb-2 flex items-center gap-2">
        <TeamLogo code={code} name={label} size="xs" link={false} />
        <p className="text-xs font-bold uppercase tracking-widest text-stext">{label} XI</p>
      </div>
      <ol className="space-y-1 text-sm text-mtext">
        {names.map((name, index) => (
          <li key={`${name}-${index}`}>
            <span className="mr-2 font-mono text-xs text-stext">{index + 1}.</span>
            {name}
          </li>
        ))}
      </ol>
    </div>
  );
}
