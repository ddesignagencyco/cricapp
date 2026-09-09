import SchedulesPageClient from './SchedulesPageClient';

export const revalidate = 60;

export const metadata = {
  title: 'Schedule',
  description: 'Daily cricket schedule and results.',
};

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default async function SchedulesPage() {
  const today = toISODate(new Date());
  return (
    <SchedulesPageClient initialDate={today} />
  );
}
