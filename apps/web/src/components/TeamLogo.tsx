'use client';

import Link from 'next/link';
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

export default function TeamLogo({ teamId, name, code, color, size = 'md', className = '', link = true }: TeamLogoProps) {
  const displayName = name || code || '';
  const accent = color || '#00C2FF';
  const initials = getInitials(displayName);
  const pslLogo = getPslLogo(code || '') || getPslLogo(teamId || '');
  const logo = pslLogo || null;
  const sizes: Record<string, string> = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-11 w-11 text-sm',
    lg: 'h-16 w-16 text-xl',
    xl: 'h-24 w-24 text-3xl',
  };
  const cls = `group relative shrink-0 ${sizes[size]} ${className}`;

  const inner = (
    <div className="relative h-full w-full transition-transform duration-500 group-hover:scale-105">
      {logo ? (
        <img
          src={logo}
          alt={displayName}
          title={displayName}
          className="relative h-full w-full rounded-full border border-white/10 bg-white object-contain p-0.5"
          style={{ borderColor: accent }}
        />
      ) : (
        <span
          className="relative grid h-full w-full place-items-center rounded-full border-2 border-white/20 font-black tracking-tighter text-white shadow-lg"
          style={{ backgroundImage: `linear-gradient(135deg, ${accent}, #111)` }}
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
