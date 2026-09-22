import { Calendar, Trophy } from 'lucide-react';
import EntityAvatar from './EntityAvatar';
import { getInitials } from '../utils/helpers';

const AVATAR = 'h-10 w-10 shrink-0 text-[11px] font-bold';

export function PlayerSearchAvatar({ name }: { name: string }) {
  const display = name || 'Player';
  return <EntityAvatar className={AVATAR}>{getInitials(display)}</EntityAvatar>;
}

export function TeamSearchAvatar({ name, code }: { id?: string; name?: string; code?: string }) {
  const display = name || code || 'Team';
  const label =
    (code || getInitials(display)).replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() ||
    getInitials(display);
  return <EntityAvatar className={AVATAR}>{label}</EntityAvatar>;
}

export function TypeSearchAvatar({ type }: { type: 'match' | 'tournament' }) {
  const Icon = type === 'match' ? Calendar : Trophy;
  return (
    <EntityAvatar className={AVATAR}>
      <Icon size={16} />
    </EntityAvatar>
  );
}
