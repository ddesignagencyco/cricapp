'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, MapPin, Shield } from 'lucide-react';
import Badge from './Badge';
import Tabs from './Tabs';
import TeamLogo from './TeamLogo';
import { getInitials } from '../utils/helpers';
import type { PslSquad, PslSquadPlayer, TabItem } from '../types/index';

const ROLE_GROUPS: Array<{ key: string; label: string; match: (role: string) => boolean }> = [
  { key: 'batsman', label: 'Batsmen', match: (role) => role === 'batsman' || role === 'batter' },
  { key: 'wicket_keeper', label: 'Wicket Keepers', match: (role) => role === 'wicket_keeper' || role === 'wicketkeeper' },
  { key: 'all_rounder', label: 'All Rounders', match: (role) => role === 'all_rounder' || role === 'allrounder' },
  { key: 'bowler', label: 'Bowlers', match: (role) => role === 'bowler' },
];

function displayName(name: string): string {
  if (!name) return 'Player';
  if (name.includes(',')) {
    const [last, first] = name.split(',').map((part) => part.trim());
    if (first && last) return `${first} ${last}`;
  }
  return name;
}

function formatRole(rawRole?: string | null): string {
  if (!rawRole) return 'Player';
  return rawRole
    .replace(/_/g, ' ')
    .trim()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function titleCase(value?: string | null): string {
  if (!value) return '';
  return value
    .trim()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function nameHash(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash % 360);
}

function groupedPlayers(players: PslSquadPlayer[]) {
  const used = new Set<string>();
  const groups: Array<{ label: string; players: PslSquadPlayer[] }> = [];

  for (const group of ROLE_GROUPS) {
    const items = players.filter((player) => {
      const role = (player.role || '').toLowerCase();
      return group.match(role) && !used.has(player.playerId);
    });
    if (!items.length) continue;
    items.forEach((player) => used.add(player.playerId));
    groups.push({ label: group.label, players: items });
  }

  const rest = players.filter((player) => !used.has(player.playerId));
  if (rest.length) groups.push({ label: 'Players', players: rest });
  return groups;
}

export default function PslSquadsBoard({ squads }: { squads: PslSquad[] }) {
  const [teamId, setTeamId] = useState(squads[0]?.teamId || '');
  const squad = useMemo(
    () => squads.find((item) => item.teamId === teamId) || squads[0],
    [squads, teamId],
  );

  if (!squads.length || !squad) {
    return (
      <div className="rounded-2xl bg-card px-6 py-10 text-center ring-1 ring-lborder">
        <p className="text-sm font-semibold text-mtext">No team data available</p>
        <p className="mt-1 text-xs text-stext">Squads will appear once rosters are confirmed.</p>
      </div>
    );
  }

  const tabs: TabItem[] = squads.map((item) => ({
    key: item.teamId,
    label: item.teamAbbr || item.teamName,
  }));
  const groups = groupedPlayers(squad.players || []);

  return (
    <div className="space-y-4">
      <Tabs tabs={tabs} active={squad.teamId} onChange={setTeamId} size="sm" />

      <div className="rounded-md border border-lborder bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <TeamLogo teamId={squad.teamId} name={squad.teamName} code={squad.teamAbbr} size="lg" link={false} />
          <div className="min-w-0 flex-1">
            <Link href={`/teams/${squad.teamId}`} className="text-lg font-semibold text-mtext hover:text-accent">
              {squad.teamName}
            </Link>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-stext">
              {squad.teamAbbr}
              {squad.manager ? ` · Coach ${squad.manager}` : ''}
              {` · ${squad.players?.length || 0} players`}
            </p>
          </div>
        </div>
      </div>

      {groups.length > 0 ? (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.label}>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-stext">
                {group.label} ({group.players.length})
              </h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {group.players.map((player) => (
                  <SquadPlayerRow key={player.playerId} player={player} teamName={squad.teamName} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-lborder bg-card px-6 py-10 text-center">
          <p className="text-sm font-semibold text-mtext">No players listed</p>
          <p className="mt-1 text-xs text-stext">This franchise squad has not been published yet.</p>
        </div>
      )}
    </div>
  );
}

function SquadPlayerRow({ player, teamName }: { player: PslSquadPlayer; teamName: string }) {
  const name = displayName(player.playerName || player.playerShortName || 'Player');
  const role = formatRole(player.role);
  const nationality = titleCase(player.nationality);
  const hue = nameHash(name);

  return (
    <Link
      href={`/players/${player.playerId}`}
      className="group flex items-center gap-3 rounded-md border border-lborder bg-card p-3 transition-colors hover:border-accent/50 hover:bg-elevated"
    >
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
        style={{
          backgroundImage: `linear-gradient(135deg, hsl(${hue}, 68%, 46%), hsl(${(hue + 38) % 360}, 72%, 32%))`,
        }}
        aria-hidden="true"
      >
        {getInitials(name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-mtext group-hover:text-accent">{name}</p>
        <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-stext">
          <Badge tone="neutral">{role}</Badge>
          {nationality ? (
            <span className="flex min-w-0 items-center gap-1 truncate">
              <MapPin size={11} className="shrink-0" />
              <span className="truncate">{nationality}</span>
            </span>
          ) : (
            <span className="flex min-w-0 items-center gap-1 truncate">
              <Shield size={11} className="shrink-0" />
              <span className="truncate">{teamName}</span>
            </span>
          )}
        </div>
      </div>
      <ChevronRight size={16} className="shrink-0 text-stext group-hover:text-accent" aria-hidden="true" />
    </Link>
  );
}
