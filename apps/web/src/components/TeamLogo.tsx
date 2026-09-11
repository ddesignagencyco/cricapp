'use client';

import Link from 'next/link';
import RemoteImage from './RemoteImage';
import { getInitials, getPslLogo } from '../utils/helpers';

interface TeamLogoProps {
  teamId?: string;
  name?: string;
  code?: string;
  color?: string;
  size?: string;
  className?: string;
  link?: boolean;
}

function hueFromName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash % 360);
}

export default function TeamLogo({ teamId, name, code, color, size = 'md', className = '', link = true }: TeamLogoProps) {
  const displayName = name || code || '';
  const abbr = (code || '').replace(/[^a-zA-Z0-9]/g, '');
  const initials = (abbr.length >= 2 && abbr.length <= 4 ? abbr : getInitials(displayName)).slice(0, 2).toUpperCase();
  const pslLogo = getPslLogo(code || '') || getPslLogo(teamId || '');
  const logo = pslLogo || null;
  const hue = hueFromName(displayName);
  const sizes: Record<string, string> = {
    xs: 'h-6 w-6 text-xs',
    sm: 'h-8 w-8 text-xs',
    search: 'h-10 w-10 text-[11px]',
    md: 'h-11 w-11 text-sm',
    lg: 'h-16 w-16 text-xl',
    xl: 'h-24 w-24 text-3xl',
  };
  const cls = `group relative shrink-0 ${sizes[size]} ${className}`;

  const inner = (
    <div className="relative h-full w-full transition-transform duration-500 group-hover:scale-105">
      {logo ? (
        <RemoteImage
          src={logo}
          alt={displayName}
          title={displayName}
          fill
          sizes="96px"
          className="rounded-full border border-white/10 bg-white object-contain p-0.5"
          style={color ? { borderColor: color } : undefined}
        />
      ) : (
        <span
          className="relative grid h-full w-full place-items-center rounded-full font-bold tracking-tight text-white"
          style={{ backgroundImage: `linear-gradient(135deg, hsl(${hue}, 75%, 50%), hsl(${(hue + 40) % 360}, 85%, 35%))` }}
          title={displayName}
        >
          {initials}
        </span>
      )}
    </div>
  );

  if (!link || !teamId) {
    return <div className={cls}>{inner}</div>;
  }

  return (
    <Link href={`/teams/${teamId}`} className={cls} title={displayName} prefetch={false}>
      {inner}
    </Link>
  );
}
