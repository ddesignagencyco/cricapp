import NewsletterUnsubscribeBody from '../../../components/boards/NewsletterUnsubscribeBody';

export const metadata = {
  title: 'Email preferences',
  description: 'Manage or unsubscribe from PAK CRICZONE newsletter emails.',
  robots: { index: false, follow: false },
};

export default async function NewsletterUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; manage?: string }>;
}) {
  const { token, manage } = await searchParams;
  return <NewsletterUnsubscribeBody token={token || ''} manage={manage === '1'} />;
}
