'use client';

import Link from 'next/link';
import { Trophy } from 'lucide-react';
import Badge from './Badge';
import TeamLogo from './TeamLogo';

const statusTones = {
  qualified: 'qualified',
  playoffs: 'playoffs',
  eliminated: 'eliminated',
  'n/a': 'neutral',
};

export default function TeamCard({ team }) {
  return (
    <Link
      href={`/teams/${team.id}`}
      className="group block rounded-2xl bg-card p-5 ring-1 ring-lborder transition-all duration-300 hover:-translate-y-0.5 hover:bg-elevated hover:ring-accent/30"
    >
      <div className="flex items-start justify-between">
        <TeamLogo teamId={team.id} size="lg" link={false} />
        {team.status !== 'n/a' && (
          <Badge tone={statusTones[team.status]}>{team.status}</Badge>
        )}
      </div>

      <h3 className="mt-4 text-base font-bold text-mtext">{team.name}</h3>
      <p className="text-xs font-semibold uppercase tracking-wider text-stext">
        {team.code} • {team.city}
      </p>

      <div className="mt-4 grid grid-cols-4 gap-2 border-t border-lborder pt-3 text-center">
        <div>
          <p className="font-mono text-base font-bold text-mtext">{team.matches}</p>
          <p className="text-[10px] uppercase tracking-wider text-stext">Played</p>
        </div>
        <div>
          <p className="font-mono text-base font-bold text-accent2">{team.wins}</p>
          <p className="text-[10px] uppercase tracking-wider text-stext">Won</p>
        </div>
        <div>
          <p className="font-mono text-base font-bold text-danger">{team.losses}</p>
          <p className="text-[10px] uppercase tracking-wider text-stext">Lost</p>
        </div>
        <div>
          <p className="font-mono text-base font-bold text-mtext">{team.points}</p>
          <p className="text-[10px] uppercase tracking-wider text-stext">Pts</p>
        </div>
      </div>

      {team.titles > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-gold">
          <Trophy size={14} /> {team.titles} PSL title{team.titles > 1 ? 's' : ''}
        </p>
      )}
    </Link>
  );
}