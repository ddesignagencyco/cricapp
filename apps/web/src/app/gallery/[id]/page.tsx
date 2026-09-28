import Link from 'next/link';
import { notFound } from 'next/navigation';
import RemoteImage from '../../../components/RemoteImage';
import MediaActions from '../../../components/MediaActions';
import { fetchGalleryItem } from '../../../services/gallery';
import { buildGalleryEmbedUrl } from '../../../utils/galleryEmbed';
import { sharePageMetadata } from '../../../services/sharing';
import type { GalleryMedia } from '../../../services/gallery';

export const revalidate = 300;

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

async function loadMedia(id: string): Promise<GalleryMedia | null> {
  try {
    return await fetchGalleryItem(decode(id));
  } catch {
    return null;
  }
}

function isPlayable(media: GalleryMedia): boolean {
  return media.type === 'video' || media.type === 'short';
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const media = await loadMedia(id);
  if (!media) return { title: 'Gallery' };
  const title = media.title || 'Gallery media';
  return sharePageMetadata({
    title,
    description: media.caption || media.title || 'Photos, shorts and videos from PakCricZone.',
    image: media.thumbnailUrl || media.url,
    path: `/gallery/${id}`,
  });
}

export default async function GalleryMediaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const media = await loadMedia(id);
  if (!media) notFound();

  const embed = buildGalleryEmbedUrl(media.url);
  const title = media.title || 'Gallery media';
  const preview = media.thumbnailUrl || media.url;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-xs text-stext">
        <Link href="/gallery" className="font-semibold text-accent hover:underline">
          Gallery
        </Link>
        <span aria-hidden="true">/</span>
        <span className="truncate text-mtext">{title}</span>
      </nav>

      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-mtext sm:text-2xl">{title}</h1>
          <p className="mt-1 text-xs text-stext">
            {[media.width && media.height ? `${media.width}×${media.height}` : '', media.format || '']
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <MediaActions
            url={media.url}
            title={title}
            shareHref={`/gallery/${encodeURIComponent(media.id)}`}
            shareText={media.caption || undefined}
            shareType="gallery"
            shareId={media.id}
            variant="card"
          />
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl bg-secondary ring-1 ring-lborder">
        {isPlayable(media) && embed ? (
          <iframe
            title={title}
            src={embed}
            className="aspect-video w-full"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="relative aspect-[4/3] w-full bg-secondary sm:aspect-[16/10]">
            <RemoteImage
              src={preview}
              alt={title}
              fill
              sizes="(min-width: 1024px) 56rem, 100vw"
              fit="contain"
              className="news-image"
            />
          </div>
        )}
      </div>

      {media.caption ? (
        <p className="mt-4 text-sm leading-relaxed text-stext">{media.caption}</p>
      ) : null}

      <div className="mt-6">
        <Link href="/gallery" className="text-sm font-semibold text-accent hover:underline">
          ← Back to gallery
        </Link>
      </div>
    </div>
  );
}
