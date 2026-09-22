'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
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
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const fileFitsType = (next: File, mediaType: GalleryMediaType) => {
    const isImage = next.type.startsWith('image/');
    return mediaType === 'image' ? isImage : !isImage;
  };

  const pickFile = (next: File | undefined) => {
    if (!next) return;
    if (!fileFitsType(next, type)) {
      toast.error(type === 'image' ? 'Choose an image file.' : 'Choose a video file.');
      return;
    }
    setFile(next);
  };

  const resetForm = () => {
    setTitle('');
    setCaption('');
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) {
      toast.error('Choose a file, then click Upload.');
      return;
    }
    setBusy(true);
    try {
      await uploadGalleryMedia({
        file,
        type,
        title: title.trim() || undefined,
        caption: caption.trim() || undefined,
      });
      resetForm();
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
        className="flex flex-wrap items-end gap-2 rounded-lg p-3"
        style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
        onSubmit={(event) => void onSubmit(event)}
      >
        <div className="w-[7.5rem] shrink-0">
          <AdminField label="Type" required>
            <AdminSelect
              value={type}
              onChange={(e) => {
                const next = e.target.value as GalleryMediaType;
                setType(next);
                if (file && !fileFitsType(file, next)) {
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }
              }}
            >
              <option value="image">Image</option>
              <option value="short">Short</option>
              <option value="video">Video</option>
            </AdminSelect>
          </AdminField>
        </div>
        <div className="min-w-[10rem] flex-1">
          <AdminField label="Title">
            <AdminInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
          </AdminField>
        </div>
        <div className="min-w-[10rem] flex-1">
          <AdminField label="Caption">
            <AdminInput value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption" />
          </AdminField>
        </div>
        <div className="w-[8.5rem] shrink-0">
          <AdminField label="File" required>
            <label
              className="inline-flex h-[38px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 text-xs font-semibold"
              style={{ border: '1px dashed var(--admin-border)', color: 'var(--admin-accent)', background: 'var(--admin-input-bg)' }}
              title={file?.name || 'Choose file'}
            >
              <Upload size={13} />
              <span className="truncate">{file ? file.name : 'Choose'}</span>
              <input
                ref={fileInputRef}
                type="file"
                accept={type === 'image' ? 'image/*' : 'video/*'}
                className="sr-only"
                disabled={busy}
                onChange={(e) => {
                  pickFile(e.target.files?.[0]);
                }}
              />
            </label>
          </AdminField>
        </div>
        <button
          type="submit"
          disabled={busy || !file}
          className="btn-brand inline-flex h-[38px] shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-bold disabled:opacity-50"
        >
          <Upload size={13} />
          {busy ? 'Uploading…' : 'Upload'}
        </button>
      </form>

      {loading ? (
        <LoadingState variant="gallery" />
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
