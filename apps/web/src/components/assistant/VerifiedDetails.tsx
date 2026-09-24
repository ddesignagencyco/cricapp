import { useState } from 'react';
import type { AssistantAskResponse } from '../../services/assistant';

function asNumber(value: unknown): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value >= 0 && value <= 1) return `${Math.round(value * 100)}%`;
  return String(value);
}

function asText(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

export default function VerifiedDetails({ reply }: { reply: AssistantAskResponse }) {
  const [open, setOpen] = useState(false);
  const [rawOpen, setRawOpen] = useState(false);
  const verified = reply.verified || {};
  const cards: Array<{ label: string; value: string }> = [];

  const teamA = asText(verified.teamAName) || asText(verified.homeName);
  const teamB = asText(verified.teamBName) || asText(verified.awayName);
  const aWins = asText(verified.teamAWins);
  const bWins = asText(verified.teamBWins);
  if (teamA && aWins) cards.push({ label: `${teamA} wins`, value: aWins });
  if (teamB && bWins) cards.push({ label: `${teamB} wins`, value: bWins });
  const meetings = asText(verified.totalMeetings);
  if (meetings) cards.push({ label: 'Meetings', value: meetings });

  const homeProb = asNumber(verified.homeWinProb);
  const awayProb = asNumber(verified.awayWinProb);
  if (homeProb) cards.push({ label: 'Home win', value: homeProb });
  if (awayProb) cards.push({ label: 'Away win', value: awayProb });
  const band = asText(verified.calibrationBand);
  if (band) cards.push({ label: 'Band', value: band });

  const cutoff = asText(verified.playoffCutoffPoints);
  if (cutoff) cards.push({ label: 'Playoff cutoff', value: cutoff });
  const seasonName = asText(verified.seasonName);
  if (seasonName) cards.push({ label: 'Season', value: seasonName });

  const hasRaw = Object.keys(verified).length > 0;
  if (!cards.length && !hasRaw) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-[11px] font-bold uppercase tracking-wider text-stext hover:text-accent"
      >
        {open ? 'Hide details' : 'Details'}
      </button>
      {open ? (
        <div className="mt-2 space-y-2">
          {cards.length > 0 ? (
            <div className="grid grid-cols-2 gap-1.5">
              {cards.map((card) => (
                <div key={card.label} className="rounded-md bg-secondary px-2 py-1.5 ring-1 ring-lborder">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stext">{card.label}</p>
                  <p className="mt-0.5 font-mono text-xs font-bold tabular-nums text-mtext">{card.value}</p>
                </div>
              ))}
            </div>
          ) : null}
          {hasRaw ? (
            <div>
              <button
                type="button"
                onClick={() => setRawOpen((v) => !v)}
                className="text-[11px] font-semibold text-stext hover:text-accent"
              >
                {rawOpen ? 'Hide raw verified payload' : 'Raw verified payload'}
              </button>
              {rawOpen ? (
                <pre className="mt-1.5 max-h-40 overflow-auto rounded-md bg-secondary p-2 text-[10px] leading-relaxed text-stext ring-1 ring-lborder">
                  {JSON.stringify(verified, null, 2)}
                </pre>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
