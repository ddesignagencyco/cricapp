import { Calendar, Trophy } from 'lucide-react';
import { getInitials } from '../utils/helpers';

function nameHash(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h % 360);
}

const AVATAR = 'h-10 w-10 shrink-0';

function ColorAvatar({ name, label }: { name: string; label: string }) {
  const hue = nameHash(name);
  return (
    <span
      className={`grid ${AVATAR} place-items-center rounded-full text-[11px] font-bold text-white`}
      style={{ backgroundImage: `linear-gradient(135deg, hsl(${hue}, 75%, 50%), hsl(${(hue + 40) % 360}, 85%, 35%))` }}
    >
      {label}
    </span>
  );
}

export function PlayerSearchAvatar({ name }: { name: string }) {
  const display = name || 'Player';
  return <ColorAvatar name={display} label={getInitials(display)} />;
}

export function TeamSearchAvatar({ name, code }: { id?: string; name?: string; code?: string }) {
  const display = name || code || 'Team';
  const label = (code || getInitials(display)).replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || getInitials(display);
  return <ColorAvatar name={display} label={label} />;
}

export function TypeSearchAvatar({ type }: { type: 'match' | 'tournament' }) {
  const Icon = type === 'match' ? Calendar : Trophy;
  return (
    <span className={`grid ${AVATAR} place-items-center rounded-full bg-elevated text-accent`}>
      <Icon size={16} />
    </span>
  );
}
