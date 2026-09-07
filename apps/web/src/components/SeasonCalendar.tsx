'use client';

import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface Props {
  year: number;
  month: number;
  onNavigate: (_year: number, _month: number) => void;
  value?: string;
  onChange?: (_value: string) => void;
  marks?: Record<string, number>;
}

export default function SeasonCalendar({ year, month, onNavigate, value, onChange, marks = {} }: Props) {
  const today = new Date();
  const selectedDay = value;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;

  const changeMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    onNavigate(y, m);
  };

  const pick = (d: Date) => {
    onChange?.(toISODate(d));
  };

  const cells: Array<Date | null> = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(year, month, d));

  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-lborder">
      <div className="mb-3 flex items-center gap-2">
        <Calendar size={15} className="text-accent2" />
        <span className="text-xs font-bold uppercase tracking-widest text-stext">Season Calendar</span>
      </div>

      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          className="grid h-8 w-8 place-items-center rounded-lg bg-elevated text-stext ring-1 ring-lborder transition-colors hover:text-mtext"
          aria-label="Previous month"
        >
          <ChevronLeft size={15} />
        </button>
        <div className="text-center">
          <p className="text-sm font-bold text-mtext">
            {MONTHS[month]} <span className="text-accent">{year}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          className="grid h-8 w-8 place-items-center rounded-lg bg-elevated text-stext ring-1 ring-lborder transition-colors hover:text-mtext"
          aria-label="Next month"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      <div className="mb-5 flex items-center justify-between gap-1">
        {Array.from({ length: 5 }, (_, i) => year - 2 + i).map((y) => (
          <button
            key={y}
            type="button"
            onClick={() => onNavigate(y, month)}
            className={`rounded-md px-2 py-1 text-[11px] font-bold transition-colors ${
              y === year
                ? 'bg-accent/15 text-accent ring-1 ring-inset ring-accent/25'
                : 'text-stext hover:bg-elevated hover:text-mtext'
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <span key={w} className="text-center text-[10px] font-semibold uppercase text-stext/70">
            {w}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <span key={`e-${i}`} />;
          const k = toISODate(d);
          const isToday = k === toISODate(today);
          const isSelected = k === selectedDay;
          const count = marks[k] || 0;
          const isPast = d < today;
          return (
            <button
              key={k}
              type="button"
              onClick={() => pick(d)}
              className={`relative grid h-9 place-items-center rounded-lg text-xs font-semibold transition-colors ${
                isSelected
                  ? 'bg-accent text-primary'
                  : isToday
                    ? 'bg-accent/20 text-accent ring-1 ring-inset ring-accent/30'
                    : isPast
                      ? 'text-stext/70 hover:bg-elevated'
                      : 'text-mtext hover:bg-elevated'
              }`}
            >
              {d.getDate()}
              {count > 0 && (
                <span
                  className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${
                    isSelected ? 'bg-primary' : 'bg-accent2'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-3 truncate text-[11px] text-stext/70">
        {value ? `Filtering by ${value}` : 'Pick a day to filter tournaments'}
      </p>
    </div>
  );
}