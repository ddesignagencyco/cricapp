export interface TrackedStatsData {
  matches: number;
  batting: {
    innings: number; runs: number; balls: number; notOuts: number; highest: number; highestNotOut: boolean;
    average: number | null; strikeRate: number | null; fifties: number; hundreds: number; fours: number; sixes: number; ducks: number;
  } | null;
  bowling: {
    innings: number; overs: string; maidens: number; runs: number; wickets: number; average: number | null;
    economy: number | null; strikeRate: number | null; best: string; fourWickets: number; fiveWickets: number;
  } | null;
}

const dash = (v: number | null | undefined, dp = 2) => (v === null || v === undefined ? '—' : v.toFixed(dp));

function Grid({ title, cells }: { title: string; cells: Array<[string, string | number]> }) {
  return (
    <section className="detail-panel p-3 sm:p-4" aria-label={title}>
      <h3 className="mb-2 text-sm font-semibold text-mtext">{title}</h3>
      <dl className="grid grid-cols-3 gap-x-4 gap-y-3 sm:grid-cols-4">
        {cells.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-stext">{label}</dt>
            <dd className="text-lg font-semibold tabular-nums text-mtext">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * Totals over the scorecards this app stores. Labelled as such, because they are not career
 * figures and a visitor could otherwise read 111 runs as a career total.
 */
export default function PlayerTrackedStats({ stats }: { stats: TrackedStatsData | null | undefined }) {
  if (!stats || !stats.matches) return null;
  const { batting: b, bowling: w } = stats;
  return (
    <div className="space-y-3" aria-label="Stats from tracked matches">
      <p className="text-xs text-stext">
        In the {stats.matches} {stats.matches === 1 ? 'match' : 'matches'} tracked here. These are not career totals.
      </p>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {b && (
          <Grid
            title="Batting"
            cells={[
              ['Innings', b.innings], ['Runs', b.runs], ['Average', dash(b.average)], ['Strike rate', dash(b.strikeRate)],
              ['Highest', `${b.highest}${b.highestNotOut ? '*' : ''}`], ['50s / 100s', `${b.fifties} / ${b.hundreds}`],
              ['4s / 6s', `${b.fours} / ${b.sixes}`], ['Not outs', b.notOuts],
            ]}
          />
        )}
        {w && (
          <Grid
            title="Bowling"
            cells={[
              ['Innings', w.innings], ['Overs', w.overs], ['Wickets', w.wickets], ['Economy', dash(w.economy)],
              ['Average', dash(w.average)], ['Best', w.best], ['Strike rate', dash(w.strikeRate, 1)], ['4w / 5w', `${w.fourWickets} / ${w.fiveWickets}`],
            ]}
          />
        )}
      </div>
    </div>
  );
}
