import NewsletterUnsubscribeBody from '../../../components/boards/NewsletterUnsubscribeBody';

export const metadata = {
  title: 'Unsubscribe',
  description: 'Unsubscribe from the PAK CRICZONE newsletter.',
};

export default async function NewsletterUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <NewsletterUnsubscribeBody token={token || ''} />;
}
