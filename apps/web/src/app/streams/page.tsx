import LiveStreamsBoard from '../../components/boards/LiveStreamsBoard';
import { fetchStreams } from '../../services/streams';

export const metadata = {
  title: 'Live Streams',
  description:
    'Watch PSL 2026 and international cricket live with expert commentary. Streams are offloaded to a CDN-grade platform so thousands of fans can watch without buffering.',
};

export default async function StreamsPage() {
  const streams = await fetchStreams();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <LiveStreamsBoard streams={streams} />
    </div>
  );
}
