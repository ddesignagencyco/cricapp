'use client';

interface OverTimelineProps {
  overs?: { over: number; runs: number; wickets: number }[];
}

export default function OverTimeline({ overs = [] }: OverTimelineProps) {
  if (!overs.length) return null;

  const maxRuns = Math.max(...overs.map((o) => o.runs), 1);

  return (
    <div className="rounded-2xl bg-card p-5 ring-1 ring-lborder">
      <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-stext">Runs Per Over</h3>
      <div className="flex items-end gap-1.5" style={{ height: 120 }}>
        {overs.map((o, i) => {
          const height = Math.max((o.runs / maxRuns) * 100, 8);
          const hasWickets = Number(o.wickets) > 0;
          return (
            <div key={i} className="group relative flex flex-1 flex-col items-center gap-1">
              <div className="absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-elevated px-2 py-1 text-[10px] font-semibold text-mtext shadow-lg ring-1 ring-lborder group-hover:block">
                Over {o.over}: {o.runs} runs{o.wickets > 0 ? ` \u2022 ${o.wickets} wkt${o.wickets > 1 ? 's' : ''}` : ''}
              </div>
              <div
                className={`w-full rounded-t-md transition-all duration-300 group-hover:opacity-80 ${
                  hasWickets ? 'bg-red-500' : 'bg-accent'
                }`}
                style={{ height: `${height}%`, minHeight: 4 }}
              />
              <span className="text-[9px] font-mono text-stext">{o.over}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-4 text-[10px] text-stext">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm bg-accent" /> Runs
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm bg-red-500" /> Wicket fell
        </span>
      </div>
    </div>
  );
}
