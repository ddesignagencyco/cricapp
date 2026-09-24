'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Swords } from 'lucide-react';
import Select from 'react-select';
import EmptyState from '../EmptyState';
import HeadToHeadWidget from '../HeadToHeadWidget';
import { fetchHeadToHead } from '../../services/headToHead';
import { fetchTeamsCatalog } from '../../services/teams';
import type { Team } from '../../types/index';
import { HeadToHead } from '../../types/index';
import { formatTeamSelectLabel } from '../../utils/helpers';

function dedupeOpponents(team: any, teamMatches: any[], catalog: Team[]): Team[] {
  const seen = new Map<string, any>();
  const teamAbbr = (team.abbr || '').toLowerCase();
  const teamId = (team.id || '').toLowerCase();

  const addOpponent = (oppId: string) => {
    if (!oppId) return;
    const oppLower = oppId.toLowerCase();
    if (oppLower === teamId || oppLower === teamAbbr) return;
    const opp = catalog.find(
      (t) =>
        (t.id || '').toLowerCase() === oppLower ||
        (t.abbr || '').toLowerCase() === oppLower
    );
    if (opp && !seen.has(opp.id)) seen.set(opp.id, opp);
  };

  for (const match of teamMatches) {
    const codes: string[] = match.teams || [];
    codes.forEach(addOpponent);
  }

  return [...seen.values()].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

interface Props {
  team: any;
  teamMatches: any[];
}

export default function TeamHeadToHead({ team, teamMatches }: Props) {
  const [catalog, setCatalog] = useState<Team[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchTeamsCatalog()
      .then((items) => {
        if (!cancelled) setCatalog(items);
      })
      .catch(() => {
        if (!cancelled) setCatalog([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const opponents = useMemo(
    () => dedupeOpponents(team, teamMatches, catalog),
    [team, teamMatches, catalog]
  );
  const [selectedId, setSelectedId] = useState<string>(opponents[0]?.id || '');
  const [data, setData] = useState<HeadToHead | null>(null);

  useEffect(() => {
    if (opponents.length && !selectedId) {
      setSelectedId(opponents[0].id);
    }
  }, [opponents, selectedId]);

  const loadH2H = useCallback(async () => {
    if (!team || !selectedId) {
      setData(null);
      return;
    }
    try {
      const res = await fetchHeadToHead(team.id, selectedId);
      setData(res);
    } catch {
      setData(null);
    }
  }, [team, selectedId]);

  useEffect(() => {
    loadH2H();
  }, [loadH2H]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl bg-card p-5 ring-1 ring-lborder sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Swords size={16} className="text-accent" />
          <div>
            <p className="text-sm font-bold text-mtext">Head to Head</p>
            <p className="text-xs text-stext">
              {team.name}{' '}
              {selectedId ? (
                <>
                  vs{' '}
                  <OpponentName opponentId={selectedId} opponents={opponents} />
                </>
              ) : (
                '— select an opponent'
              )}
            </p>
          </div>
        </div>
        {opponents.length > 0 && (
          <Select
            value={opponents.find((o) => o.id === selectedId) || null}
            onChange={(option) => setSelectedId(option?.id || '')}
            options={opponents}
            getOptionLabel={(option) => formatTeamSelectLabel(option)}
            getOptionValue={(option) => option.id}
            placeholder="Select opponent..."
            className="react-select-container"
            classNamePrefix="react-select"
            isSearchable
            styles={{
              control: (base, state) => ({
                ...base,
                backgroundColor: 'var(--color-elevated)',
                borderColor: state.isFocused ? 'var(--color-accent)' : 'var(--color-lborder)',
                borderRadius: '0.25rem',
                padding: '0.25rem 0.5rem',
                boxShadow: 'none',
                '&:hover': {
                  borderColor: 'var(--color-accent)',
                },
              }),
              option: (base, state) => ({
                ...base,
                backgroundColor: state.isFocused ? 'var(--color-accent)' : 'var(--color-elevated)',
                color: state.isFocused ? 'white' : 'var(--color-mtext)',
                borderRadius: '0.25rem',
                margin: '2px 4px',
                padding: '8px 12px',
              }),
              menu: (base) => ({
                ...base,
                backgroundColor: 'var(--color-elevated)',
                border: '1px solid var(--color-lborder)',
                borderRadius: '0.25rem',
                overflow: 'hidden',
              }),
              singleValue: (base) => ({
                ...base,
                color: 'var(--color-mtext)',
                fontWeight: 600,
              }),
              input: (base) => ({
                ...base,
                color: 'var(--color-mtext)',
              }),
              placeholder: (base) => ({
                ...base,
                color: 'var(--color-stext)',
              }),
              dropdownIndicator: (base) => ({
                ...base,
                color: 'var(--color-stext)',
              }),
              indicatorSeparator: (base) => ({
                ...base,
                backgroundColor: 'var(--color-lborder)',
              }),
              noOptionsMessage: (base) => ({
                ...base,
                color: 'var(--color-stext)',
              }),
            }}
          />
        )}
      </div>

      {data ? (
        <HeadToHeadWidget data={data} />
      ) : opponents.length > 0 ? (
        <div className="rounded-2xl bg-card p-5 ring-1 ring-lborder">
          <div className="mb-3 flex items-center gap-2">
            <Swords size={16} className="text-accent" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-stext">Head to Head</h3>
          </div>
          <p className="text-sm text-stext">
            No head-to-head records are available for this matchup yet.
          </p>
        </div>
      ) : (
        <EmptyState
          title="No opponents found"
          message="No known opponents found to compare against. Opponents will appear as match data is synced."
        />
      )}
    </div>
  );
}

function OpponentName({ opponentId, opponents }: { opponentId: string; opponents: Team[] }) {
  const opp = opponents.find((t) => t.id === opponentId);
  return <span className="font-semibold text-mtext">{opp?.name || opponentId}</span>;
}
