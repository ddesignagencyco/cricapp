import LiveStreamsBoard from '../../components/boards/LiveStreamsBoard';

export const metadata = {
  title: 'Live Streams',
  description: 'Watch cricket live streams published by PakCricZone.',
};

export default function StreamsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <LiveStreamsBoard />
    </div>
  );
}
