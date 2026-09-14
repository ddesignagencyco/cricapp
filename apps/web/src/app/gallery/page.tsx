import GalleryBoard from '../../components/boards/GalleryBoard';
import { fetchNews } from '../../services/news';
import { fetchStreams } from '../../services/streams';
import { newsHref } from '../../utils/newsConstraints';
import { isVerticalShortUrl } from '../../utils/galleryEmbed';
import type { GalleryPhoto, GalleryShort } from '../../components/gallery/galleryTypes';

export const revalidate = 60;

export const metadata = {
  title: 'Gallery',
  description: 'Images, shorts, videos and stories from PakCricZone.',
};

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab === 'shorts' || params.tab === 'videos' || params.tab === 'stories' || params.tab === 'images' || params.tab === 'photos'
    ? (params.tab === 'photos' ? 'images' : params.tab)
    : 'images';

  const [englishNews, urduNews, streams] = await Promise.all([
    fetchNews({ limit: 40, language: 'en' }).catch(() => []),
    fetchNews({ limit: 40, language: 'ur' }).catch(() => []),
    fetchStreams({ limit: 40 }).catch(() => []),
  ]);

  const news = uniqueById([...englishNews, ...urduNews]).filter((item) => item.image);
  const images: GalleryPhoto[] = news.map((item) => ({
    id: item.id,
    src: item.image as string,
    title: item.title,
    href: newsHref(item),
    language: item.language,
    author: item.author,
    date: item.date,
    excerpt: item.excerpt,
  }));
  const stories = images.slice(0, 16);

  const streamItems: GalleryShort[] = streams
    .filter((stream) => stream.embedUrl || stream.image)
    .map((stream) => ({
      id: `stream-${stream.id}`,
      title: stream.shortTitle || stream.title,
      image: stream.image,
      embedUrl: stream.embedUrl,
      rawUrl: stream.embedUrl,
      status: stream.status,
      href: '/streams',
      kind: 'video' as const,
    }));

  const shorts: GalleryShort[] = [
    ...streamItems.filter((item) => isVerticalShortUrl(item.embedUrl || item.rawUrl)),
    ...images.slice(0, 12).map((photo) => ({
      id: `clip-${photo.id}`,
      title: photo.title,
      image: photo.src,
      href: photo.href,
      kind: 'photo' as const,
    })),
  ];

  const videos = streamItems.filter((item) => !isVerticalShortUrl(item.embedUrl || item.rawUrl));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <GalleryBoard images={images} shorts={shorts} videos={videos} stories={stories} initialTab={tab} />
    </div>
  );
}
