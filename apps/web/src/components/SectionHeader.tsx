'use client';

import Link from 'next/link';
import { Calendar, CalendarDays, Newspaper, Trophy, Users, Video, Zap } from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  calendar: Calendar,
  calendardays: CalendarDays,
  newspaper: Newspaper,
  trophy: Trophy,
  users: Users,
  video: Video,
  zap: Zap,
};

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
  to?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function SectionHeader({
  title, subtitle, icon, to, actionLabel, onAction,
}: SectionHeaderProps) {
  const Icon = icon ? iconMap[icon.toLowerCase()] : null;
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Icon size={18} strokeWidth={2.5} />
          </div>
        )}
        <div>
          <h2 className="text-xl font-bold tracking-tight text-mtext sm:text-2xl">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-stext">{subtitle}</p>}
        </div>
      </div>
      {to && (
        <Link href={to} className="group flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-accent transition-all duration-300 hover:text-accent2">
          {actionLabel || 'View all'}
          <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
        </Link>
      )}
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="group flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-accent transition-all duration-300 hover:text-accent2"
        >
          {actionLabel || 'View all'}
          <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
        </button>
      )}
    </div>
  );
}
