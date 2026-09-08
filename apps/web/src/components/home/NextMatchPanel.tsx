'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { getInitials } from '../../utils/helpers';

interface NextMatchPanelProps {
  match: any;
}

function getTimeLeft(target: string) {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hrs: 0, mins: 0, secs: 0 };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hrs: Math.floor((diff / (1000 * 60 * 60)) % 24),
    mins: Math.floor((diff / (1000 * 60)) % 60),
    secs: Math.floor((diff / 1000) % 60),
  };
}

export default function NextMatchPanel({ match }: NextMatchPanelProps) {
  const [time, setTime] = useState({ days: 0, hrs: 0, mins: 0, secs: 0 });

  useEffect(() => {
    if (!match) return;
    const scheduled = match.scheduled || `${match.date}T${match.time || '00:00'}:00`;
    setTime(getTimeLeft(scheduled));
    const id = setInterval(() => setTime(getTimeLeft(scheduled)), 1000);
    return () => clearInterval(id);
  }, [match]);

  if (!match) return null;

  const teams = match.teams;
  const isObj = teams && typeof teams === 'object' && !Array.isArray(teams);
  const home = isObj ? teams.home : null;
  const away = isObj ? teams.away : null;
  const homeName = home?.name || (Array.isArray(teams) ? teams[0] : '');
  const awayName = away?.name || (Array.isArray(teams) ? teams[1] : '');
  const homeCode = home?.code || '';
  const awayCode = away?.code || '';

  const venue = match.venue || '';
  const scheduled = match.scheduled || `${match.date}T${match.time || '00:00'}:00`;
  const d = new Date(scheduled);
  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const units = [
    { val: time.days, label: 'DAYS' },
    { val: time.hrs, label: 'HRS' },
    { val: time.mins, label: 'MINS' },
    { val: time.secs, label: 'SECS' },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
      <div className="rounded-xl bg-card p-3 ring-1 ring-lborder sm:p-4">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between sm:gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-block rounded bg-accent/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent">
              NEXT MATCH
            </span>
            <div className="flex items-center gap-2">
              <TeamLogoSm code={homeCode} name={homeName} />
              <div>
                <p className="text-xs font-bold text-mtext">{homeName}</p>
                <p className="text-[10px] uppercase tracking-wider text-stext">{homeCode}</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-stext">vs</span>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-xs font-bold text-mtext">{awayName}</p>
                <p className="text-[10px] uppercase tracking-wider text-stext">{awayCode}</p>
              </div>
              <TeamLogoSm code={awayCode} name={awayName} />
            </div>
          </div>

          <div className="hidden items-center gap-4 sm:flex">
            <div className="flex items-center gap-1.5 text-[10px] text-stext">
              <MapPin size={11} className="text-accent/70" />
              <span>{venue}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-stext">
              <Calendar size={11} className="text-accent/70" />
              <span>{dateStr}</span>
              <Clock size={11} className="text-accent/70" />
              <span>{timeStr}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <p className="mr-1 text-[9px] font-bold uppercase tracking-wider text-stext">STARTS IN</p>
            {units.map((u) => (
              <div key={u.label} className="flex flex-col items-center">
                <span className="font-mono text-base font-black tabular-nums text-mtext">{String(u.val).padStart(2, '0')}</span>
                <span className="text-[7px] font-bold uppercase tracking-wider text-stext">{u.label}</span>
              </div>
            ))}
          </div>

          <Link
            href="/schedules"
            className="whitespace-nowrap text-[10px] font-semibold text-accent transition-colors hover:text-accent2"
          >
            View Schedule &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}

function TeamLogoSm({ code, name }: { code: string; name: string }) {
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);

  return (
    <span
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-white/10 text-[10px] font-black text-white shadow-sm"
      style={{ backgroundImage: `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${(hue + 40) % 360}, 80%, 35%))` }}
      title={name}
    >
      {getInitials(name || code)}
    </span>
  );
}
