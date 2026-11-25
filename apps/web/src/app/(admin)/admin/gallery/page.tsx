'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import {
  CloudUpload,
  Film,
  ImageIcon,
  Loader2,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
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
  uploadGalleryMedia,
  type GalleryMediaType,
} from '../../../../services/gallery';
import { galleryKeys } from '../../../../queries/keys';
import { useGalleryQuery } from '../../../../queries/useDirectoryQueries';

const LIMIT = 24;
const FILTERS: { key: '' | GalleryMediaType; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'image', label: 'Images' },
  { key: 'short', label: 'Shorts' },
  { key: 'video', label: 'Videos' },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminGalleryPage() {
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [type, setType] = useState<GalleryMediaType>('image');
  const [filter, setFilter] = useState<'' | GalleryMediaType>('');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const galleryQuery = useGalleryQuery({ page, limit: LIMIT, type: filter || undefined });
  const items = galleryQuery.data?.items || [];
  const total = galleryQuery.data?.total || 0;
  const totalPages = Math.max(1, galleryQuery.data?.totalPages || Math.ceil(total / LIMIT));

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pickFile = (next: File | undefined) => {
    if (!next) return;
    const isImage = next.type.startsWith('image/');
    const isVideo = next.type.startsWith('video/');
    if (!isImage && !isVideo) {
      toast.error('Please choose an image or video file.');
      return;
    }
    // Auto-switch media type to match the dropped file for frictionless UX
    if (isImage && type !== 'image') setType('image');
    if (isVideo && type === 'image') setType('video');
    setFile(next);
    if (!title.trim()) {
      const cleanName = next.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
      if (cleanName) setTitle(cleanName);
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (busy) return;
    const dropped = e.dataTransfer?.files?.[0];
    pickFile(dropped);
  };

  const resetForm = () => {
    setTitle('');
    setCaption('');
    setFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) {
      toast.error('Drop or choose a file, then click Upload.');
      return;
    }
    setBusy(true);
    setUploadProgress(5);
    try {
      await uploadGalleryMedia({
        file,
        type,
        title: title.trim() || undefined,
        caption: caption.trim() || undefined,
        onProgress: (pct) => setUploadProgress(pct),
      });
      await queryClient.invalidateQueries({ queryKey: galleryKeys.lists() });
      setPage(1);
      resetForm();
      toast.success('Media uploaded successfully!');
      if (filter && filter !== type) setFilter('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
      setUploadProgress(0);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Gallery"
        subtitle="Drag & drop images, shorts or videos. Newly uploaded media always appears first."
        actions={
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((item) => (
              <button
                key={item.key || 'all'}
                type="button"
                onClick={() => {
                  setFilter(item.key);
                  setPage(1);
                }}
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
        className="rounded-xl p-4 sm:p-5"
        style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
        onSubmit={(event) => void onSubmit(event)}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (!busy) setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => !busy && fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !busy) fileInputRef.current?.click();
            }}
            className={`relative flex min-h-[168px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition-all ${
              dragOver ? 'scale-[1.01] border-accent bg-accent/10' : 'hover:border-accent/60'
            }`}
            style={{
              borderColor: dragOver ? undefined : 'var(--admin-border)',
              background: dragOver ? undefined : 'var(--admin-bg)',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="sr-only"
              disabled={busy}
              onChange={(e) => pickFile(e.target.files?.[0])}
            />

            {file && previewUrl ? (
              <div className="flex w-full items-center gap-4 text-left">
                <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg border border-lborder bg-black/20">
                  {file.type.startsWith('image/') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} alt={file.name} className="h-full w-full object-cover" />
                  ) : (
                    <video src={previewUrl} className="h-full w-full object-cover" muted />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                    {file.name}
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                    {formatBytes(file.size)} · {file.type || type}
                  </p>
                  {!busy && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        resetForm();
                      }}
                      className="mt-2 inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold text-danger hover:bg-danger/10"
                    >
                      <X size={12} /> Remove file
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div
                  className="mb-2.5 grid h-11 w-11 place-items-center rounded-full"
                  style={{ background: 'var(--admin-info-bg)', color: 'var(--admin-accent)' }}
                >
                  <CloudUpload size={22} />
                </div>
                <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                  Drag &amp; drop image or video here
                </p>
                <p className="mt-1 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                  or click to browse · JPG, PNG, WebP, MP4, WebM
                </p>
              </>
            )}
          </div>

          {/* Metadata & Upload Action */}
          <div className="flex flex-col justify-between gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <AdminField label="Media Type" required>
                <AdminSelect
                  value={type}
                  onChange={(e) => setType(e.target.value as GalleryMediaType)}
                  aria-label="Media Type"
                >
                  <option value="image">Image</option>
                  <option value="short">Short (Vertical Video)</option>
                  <option value="video">Video</option>
                </AdminSelect>
              </AdminField>
              <AdminField label="Title">
                <AdminInput
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Match highlight or photo title"
                  disabled={busy}
                />
              </AdminField>
            </div>

            <AdminField label="Caption">
              <AdminInput
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Optional short caption"
                disabled={busy}
              />
            </AdminField>

            {busy && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 size={13} className="animate-spin text-accent" />
                    {uploadProgress < 99 ? `Uploading… ${uploadProgress}%` : 'Processing & optimizing…'}
                  </span>
                  <span className="tabular-nums text-accent">{uploadProgress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-brand transition-all duration-200"
                    style={{ width: `${Math.max(8, uploadProgress)}%` }}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={busy || !file}
              className="btn-brand inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg px-4 text-xs font-bold text-white disabled:opacity-50"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              {busy ? `Uploading (${uploadProgress}%)…` : 'Upload to Gallery'}
            </button>
          </div>
        </div>
      </form>

      {galleryQuery.isPending ? (
        <LoadingState variant="gallery" />
      ) : galleryQuery.isError ? (
        <ErrorState message="Could not load gallery." onRetry={() => void galleryQuery.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={<ImageIcon size={28} />} title="No gallery media" message="Drag & drop an image, short, or video above." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {items.map((item) => (
              <div
                key={item.id}
                className="group overflow-hidden rounded-xl transition-shadow hover:shadow-md"
                style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-secondary">
                  {item.type === 'image' ? (
                    <RemoteImage
                      src={item.thumbnailUrl || item.url}
                      alt={item.title || 'Gallery'}
                      width={360}
                      height={270}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <video src={item.url} className="h-full w-full object-cover" muted />
                  )}
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-semibold capitalize text-white backdrop-blur-sm">
                    {item.type === 'image' ? <ImageIcon size={10} /> : <Film size={10} />}
                    {item.type}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <p
                      className="truncate text-xs font-semibold"
                      style={{ color: 'var(--admin-text)' }}
                      title={item.title || item.type}
                    >
                      {item.title || item.type}
                    </p>
                    {item.caption && (
                      <p className="truncate text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
                        {item.caption}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteId(item.id)}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-md hover:bg-danger/10"
                    style={{ color: 'var(--admin-danger)' }}
                    title="Delete"
                  >
                    <Trash2 size={14} />
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
            onPageChange={setPage}
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
            await queryClient.invalidateQueries({ queryKey: galleryKeys.lists() });
            toast.success('Deleted.');
            if (items.length === 1 && page > 1) setPage(page - 1);
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
