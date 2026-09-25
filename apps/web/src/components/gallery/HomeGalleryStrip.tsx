'use client';

import Link from 'next/link';
import RemoteImage from '../RemoteImage';
import SectionHeader from '../SectionHeader';
import { useGalleryQuery } from '../../queries/useDirectoryQueries';

export default function HomeGalleryStrip() {
  const query = useGalleryQuery({ type: 'image', page: 1, limit: 6 });
  const items = query.data?.items || [];
  if (query.isPending || query.isError || items.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 sm:px-6">
      <SectionHeader title="Gallery" subtitle="Images, shorts and videos" icon="images" to="/gallery" actionLabel="Open gallery" />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((item) => (
          <Link key={item.id} href="/gallery?tab=images" className="card-diamond card-interactive group overflow-hidden rounded-md border border-lborder bg-card">
            <div className="relative aspect-square bg-secondary">
              <RemoteImage
                src={item.thumbnailUrl || item.url}
                alt={item.title || 'Gallery image'}
                fill
                sizes="180px"
                fit="contain"
                className="news-image"
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
