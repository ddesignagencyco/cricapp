'use client';

import Link from 'next/link';
import { Calendar, CalendarDays, Newspaper, Trophy, Users, Video, Zap } from 'lucide-react';

const iconMap = {
  calendar: Calendar,
  calendardays: CalendarDays,
  newspaper: Newspaper,
  trophy: Trophy,
  users: Users,
  video: Video,
  zap: Zap,
};

export default function SectionHeader({
  title, subtitle, icon, to, actionLabel, onAction,
}) {
  const Icon = typeof icon === 'string' ? iconMap[icon] : null;
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        {Icon && (
          <div className="mb-2 flex items-center gap-2 text-accent">
            <Icon size={18} strokeWidth={2.2} />
            {subtitle && (
              <span className="text-xs font-semibold uppercase tracking-widest text-stext">{subtitle}</span>
            )}
          </div>
        )}
        <h2 className="text-xl font-bold tracking-tight text-mtext sm:text-2xl">{title}</h2>
      </div>
      {to && (
        <Link href={to} className="shrink-0 whitespace-nowrap text-sm font-semibold text-accent transition-colors hover:text-accent2">
          {actionLabel || 'View all'}
        </Link>
      )}
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="shrink-0 whitespace-nowrap text-sm font-semibold text-accent transition-colors hover:text-accent2"
        >
          {actionLabel || 'View all'}
        </button>
      )}
    </div>
  );
}