import GalleryBoard, { type GalleryTab } from '../../components/boards/GalleryBoard';

export const metadata = {
  title: 'Gallery',
  description: 'Images, shorts and videos from PakCricZone.',
};

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab: GalleryTab =
    params.tab === 'shorts' || params.tab === 'videos' ? params.tab : 'images';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <GalleryBoard initialTab={tab} />
    </div>
  );
}
