'use client';

import Link from 'next/link';
import { getInitials, getTeam } from '../utils/helpers';

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
  const team = teamId ? getTeam(teamId) : null;
  const displayName = name || team?.name || code || '';
  const accent = color || team?.colors?.primary || '#00C2FF';
  const initials = getInitials(displayName);
  const logo = team?.logo || null;
  const sizes: Record<string, string> = {
    xs: 'h-8 w-8',
    sm: 'h-10 w-10',
    md: 'h-14 w-14',
    lg: 'h-20 w-20',
    xl: 'h-28 w-28',
  };
  const border = 'border-2';
  const cls = `relative grid shrink-0 place-items-center overflow-hidden rounded-full ${sizes[size]} ${className}`;

  const inner = logo ? (
    <img
      src={logo}
      alt={displayName}
      title={displayName}
      className={`h-full w-full rounded-full object-cover ${border}`}
      style={{ borderColor: accent }}
    />
  ) : (
    <span
      className={`grid h-full w-full place-items-center rounded-full font-extrabold tracking-tight ${border}`}
      style={{ color: accent, borderColor: accent }}
      title={displayName}
    >
      {initials}
    </span>
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
