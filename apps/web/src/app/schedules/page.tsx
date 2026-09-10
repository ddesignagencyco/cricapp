import SchedulesPageClient from './SchedulesPageClient';
import { toKarachiISODate } from '../../utils/helpers';

export const revalidate = 60;

export const metadata = {
  title: 'Schedule',
  description: 'Daily cricket schedule and results.',
};

export default async function SchedulesPage() {
  const today = toKarachiISODate();
  return (
    <SchedulesPageClient initialDate={today} />
  );
}
