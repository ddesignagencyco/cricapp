'use client';

export default function ScorecardTable({ kind = 'batting', data = [] }) {
  const isBatting = kind === 'batting';
  const heads = isBatting
    ? ['Batter', 'R', 'B', '4s', '6s', 'SR']
    : ['Bowler', 'O', 'M', 'R', 'W', 'ECO'];

  return (
    <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-lborder">
      <div className="overflow-x-auto">
        <table className={`w-full min-w-[480px] text-left text-sm`}>
          <thead>
            <tr className="border-b border-lborder text-[11px] uppercase tracking-wider text-stext">
              {heads.map((h) => (
                <th key={h} className="px-4 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isBatting
              ? data.map((row, i) => (
                  <tr key={row.id || `${row.name}-${i}`} className="border-b border-lborder/60 last:border-0 hover:bg-elevated/60">
                    <td className="px-4 py-2.5">
                      <span className="font-semibold text-mtext">{row.name}</span>
                    </td>
                    <td className={`px-4 py-2.5 font-mono font-bold tabular-nums ${row.out ? 'text-stext' : 'text-mtext'}`}>
                      {row.runs}{!row.out && <span className="text-accent2">*</span>}
                    </td>
                    <td className="px-4 py-2.5 font-mono tabular-nums text-stext">{row.balls}</td>
                    <td className="px-4 py-2.5 font-mono tabular-nums text-stext">{row.fours}</td>
                    <td className="px-4 py-2.5 font-mono tabular-nums text-stext">{row.sixes}</td>
                    <td className="px-4 py-2.5 font-mono tabular-nums text-stext">{row.sr}</td>
                  </tr>
                ))
              : data.map((row, i) => (
                  <tr key={row.id || `${row.name}-${i}`} className="border-b border-lborder/60 last:border-0 hover:bg-elevated/60">
                    <td className="px-4 py-2.5 font-semibold text-mtext">{row.name}</td>
                    <td className="px-4 py-2.5 font-mono tabular-nums text-stext">{row.oversFull}</td>
                    <td className="px-4 py-2.5 font-mono tabular-nums text-stext">{row.maidens}</td>
                    <td className="px-4 py-2.5 font-mono font-bold tabular-nums text-mtext">{row.runsGiven}</td>
                    <td className="px-4 py-2.5"><span className="font-mono font-bold tabular-nums text-accent2">{row.wickets}</span></td>
                    <td className="px-4 py-2.5 font-mono tabular-nums text-stext">{row.econ}</td>
                  </tr>
                ))}
            {data.length === 0 && (
              <tr><td colSpan={heads.length} className="px-4 py-8 text-center text-stext">Scorecard not available yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}