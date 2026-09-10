'use client';

import Link from 'next/link';
import { ArrowRight, Globe, Shield, Sparkles } from 'lucide-react';
import { getInitials, getPslLogo } from '../utils/helpers';

interface TeamCardProps {
  team: any;
}

export default function TeamCard({ team }: TeamCardProps) {
  const name = team.name || 'Cricket Club';
  const code = team.abbr || team.code || '';
  const country = team.country || '';
  const city = team.city || '';
  const initials = getInitials(name || code);

  // Check for specialized PSL or external logo
  const pslLogo = getPslLogo(code) || getPslLogo(team.id);
  const logo = team.logoUrl || team.logo || pslLogo;

  // Curated gradient based on team name / code hash
  let hash = 0;
  const str = code || name;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  const primaryColor = team.colors?.primary || `hsl(${hue}, 75%, 45%)`;
  const secondaryColor = team.colors?.secondary || `hsl(${(hue + 45) % 360}, 85%, 25%)`;

  return (
    <Link
      href={`/teams/${team.id}`}
      className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-lborder bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:bg-elevated hover:shadow-xl hover:shadow-accent/10"
    >
      {/* Background ambient gradient flare on hover */}
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full opacity-10 blur-2xl transition-opacity duration-500 group-hover:opacity-25"
        style={{ background: primaryColor }}
      />

      <div>
        {/* Top bar: Country/Type Badge & Abbr Pill */}
        <div className="flex items-center justify-between gap-2">
          {country ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-stext border border-lborder/60">
              <Globe size={10} className="text-accent" />
              {country}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-stext border border-lborder/60">
              <Shield size={10} className="text-accent" />
              Cricket Team
            </span>
          )}

          {code && (
            <span className="font-mono text-xs font-black uppercase tracking-widest text-accent">
              {code}
            </span>
          )}
        </div>

        {/* Center Team Emblem */}
        <div className="mt-5 flex flex-col items-center text-center">
          <div className="relative mb-3.5">
            {/* Glow ring */}
            <div
              className="absolute -inset-1 rounded-full opacity-20 blur-md transition-all duration-500 group-hover:opacity-60 group-hover:scale-110"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
            />
            {logo ? (
              <img
                src={logo}
                alt={name}
                loading="lazy"
                className="relative h-20 w-20 rounded-full border-2 border-white/20 bg-primary object-contain p-1.5 shadow-md transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div
                className="relative grid h-20 w-20 place-items-center rounded-full border-2 border-white/20 text-2xl font-black tracking-tight text-white shadow-md transition-transform duration-500 group-hover:scale-105"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                }}
              >
                {initials}
              </div>
            )}
          </div>

          <h3 className="w-full text-base font-black tracking-tight text-mtext transition-colors group-hover:text-accent line-clamp-1">
            {name}
          </h3>

          {city && city !== country && (
            <p className="mt-0.5 text-xs text-stext line-clamp-1 font-medium">
              {city}
            </p>
          )}
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="mt-5 flex items-center justify-between border-t border-lborder/60 pt-3 text-xs">
        <span className="text-xs font-semibold text-stext">View Roster</span>
        <span className="inline-flex items-center gap-1 font-bold text-accent transition-transform duration-300 group-hover:translate-x-1">
          <span>Explore</span>
          <ArrowRight size={13} />
        </span>
      </div>
    </Link>
  );
}
