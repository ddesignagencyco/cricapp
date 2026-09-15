'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ImageIcon, Trash2, Upload } from 'lucide-react';
import {
  AdminField,
  AdminInput,
  AdminPageHeader,
  AdminSelect,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../../components/admin/AdminShared';
import AdminPagination from '../../../../components/admin/AdminPagination';
import RemoteImage from '../../../../components/RemoteImage';
import {
  deleteGalleryMedia,
  fetchGalleryPage,
  uploadGalleryMedia,
  type GalleryMedia,
  type GalleryMediaType,
} from '../../../../services/gallery';

const LIMIT = 24;
const FILTERS: { key: '' | GalleryMediaType; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'image', label: 'Images' },
  { key: 'short', label: 'Shorts' },
  { key: 'video', label: 'Videos' },
];

export default function AdminGalleryPage() {
  const [items, setItems] = useState<GalleryMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState<GalleryMediaType>('image');
  const [filter, setFilter] = useState<'' | GalleryMediaType>('');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const load = (nextPage = page, nextFilter = filter) => {
    setLoading(true);
    setError(false);
    fetchGalleryPage({
      page: nextPage,
      limit: LIMIT,
      ...(nextFilter ? { type: nextFilter } : {}),
    })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
        setTotalPages(Math.max(1, res.totalPages));
        setPage(nextPage);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(1, filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      await uploadGalleryMedia({
        file,
        type,
        title: title.trim() || undefined,
        caption: caption.trim() || undefined,
      });
      setTitle('');
      setCaption('');
      toast.success('Media uploaded.');
      if (filter === type) load(1, type);
      else setFilter(type);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Gallery"
        subtitle="Images, shorts and videos on GET /gallery. Article covers pick images from here."
        actions={
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((item) => (
              <button
                key={item.key || 'all'}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  filter === item.key ? 'btn-brand' : ''
                }`}
                style={
                  filter === item.key
                    ? undefined
                    : { border: '1px solid var(--admin-border)', color: 'var(--admin-text-secondary)' }
                }
              >
                {item.label}
              </button>
            ))}
          </div>
        }
      />

      <form
        className="grid grid-cols-1 gap-3 rounded-lg p-4 sm:grid-cols-2 lg:grid-cols-4"
        style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
        onSubmit={(e) => e.preventDefault()}
      >
        <AdminField label="Type" required>
          <AdminSelect value={type} onChange={(e) => setType(e.target.value as GalleryMediaType)}>
            <option value="image">Image</option>
            <option value="short">Short</option>
            <option value="video">Video</option>
          </AdminSelect>
        </AdminField>
        <AdminField label="Title">
          <AdminInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
        </AdminField>
        <AdminField label="Caption">
          <AdminInput value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption" />
        </AdminField>
        <AdminField label="File" required>
          <label
            className="inline-flex h-[38px] w-full cursor-pointer items-center justify-center gap-2 rounded-md px-3 text-xs font-semibold"
            style={{ border: '1px dashed var(--admin-border)', color: 'var(--admin-accent)', background: 'var(--admin-input-bg)' }}
          >
            <Upload size={14} />
            {busy ? 'Uploading…' : 'Choose file'}
            <input
              type="file"
              accept={type === 'image' ? 'image/*' : 'video/*'}
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                void onFile(file);
              }}
            />
          </label>
        </AdminField>
      </form>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message="Could not load gallery." onRetry={() => load(page, filter)} />
      ) : items.length === 0 ? (
        <EmptyState icon={<ImageIcon size={28} />} title="No gallery media" message="Upload an image, short, or video." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {items.map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-lg"
                style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
              >
                {item.type === 'image' ? (
                  <RemoteImage
                    src={item.thumbnailUrl || item.url}
                    alt={item.title || 'Gallery'}
                    width={240}
                    height={160}
                    className="h-24 w-full object-cover"
                  />
                ) : (
                  <video src={item.url} className="h-24 w-full object-cover" muted />
                )}
                <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>
                      {item.title || item.type}
                    </p>
                    <p className="text-[10px] capitalize" style={{ color: 'var(--admin-text-muted)' }}>{item.type}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteId(item.id)}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-md"
                    style={{ color: 'var(--admin-danger)' }}
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <AdminPagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={LIMIT}
            onPageChange={(next) => load(next, filter)}
          />
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete gallery item?"
        message="This removes the file from Cloudinary and the public gallery."
        confirmLabel="Delete"
        onCancel={() => setDeleteId(null)}
        onConfirm={async () => {
          if (!deleteId) return;
          try {
            await deleteGalleryMedia(deleteId);
            toast.success('Deleted.');
            const nextPage = items.length === 1 && page > 1 ? page - 1 : page;
            load(nextPage, filter);
          } catch {
            toast.error('Could not delete.');
          } finally {
            setDeleteId(null);
          }
        }}
      />
    </div>
  );
}
