'use client';

import Link from 'next/link';
import RemoteImage from './RemoteImage';
import EntityAvatar from './EntityAvatar';
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
  const abbr = (code || '').replace(/[^a-zA-Z0-9]/g, '');
  const initials = (abbr.length >= 2 && abbr.length <= 4 ? abbr : getInitials(displayName)).slice(0, 2).toUpperCase();
  const pslLogo = getPslLogo(code || '') || getPslLogo(teamId || '');
  const logo = pslLogo || null;
  const sizes: Record<string, string> = {
    xs: 'h-6 w-6 text-xs',
    sm: 'h-8 w-8 text-xs',
    search: 'h-10 w-10 text-[11px]',
    md: 'h-11 w-11 text-sm',
    lg: 'h-16 w-16 text-xl',
    xl: 'h-24 w-24 text-3xl',
    '2xl': 'h-32 w-32 text-4xl',
  };
  const pixels: Record<string, number> = {
    xs: 24,
    sm: 32,
    search: 40,
    md: 44,
    lg: 64,
    xl: 96,
    '2xl': 128,
  };
  const cls = `group relative shrink-0 ${sizes[size] || sizes.md} ${className}`;

  const inner = (
    <div className="relative h-full w-full transition-transform duration-500 group-hover:scale-105">
      {logo ? (
        <RemoteImage
          src={logo}
          alt={displayName}
          title={displayName}
          fill
          sizes={`${pixels[size] || 96}px`}
          className="avatar-3d rounded-full bg-white object-contain p-0.5"
          style={color ? { borderColor: color } : undefined}
        />
      ) : (
        <EntityAvatar className="relative h-full w-full font-bold tracking-tight" title={displayName}>
          {initials}
        </EntityAvatar>
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
