'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ImageIcon, Loader2, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import RemoteImage from '../RemoteImage';
import AdminPagination from './AdminPagination';
import useFocusTrap from '../../hooks/useFocusTrap';
import {
  uploadGalleryMedia,
} from '../../services/gallery';
import { galleryKeys } from '../../queries/keys';
import { useGalleryQuery } from '../../queries/useDirectoryQueries';

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/avif';
const LIMIT = 20;

interface MediaPickerProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  onSelect: (_url: string) => void;
}

export default function MediaPicker({
  open,
  title = 'Choose image',
  onClose,
  onSelect,
}: MediaPickerProps) {
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const galleryQuery = useGalleryQuery({ type: 'image', page, limit: LIMIT }, open);
  const items = galleryQuery.data?.items || [];
  const total = galleryQuery.data?.total || 0;
  const totalPages = Math.max(1, galleryQuery.data?.totalPages || Math.ceil(total / LIMIT));
  const dialogRef = useFocusTrap<HTMLDivElement>(open);

  useEffect(() => {
    if (!open) return;
    setPage(1);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [busy, onClose, open]);

  const pick = (url: string) => {
    onSelect(url);
    onClose();
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Articles only accept images.');
      return;
    }
    setBusy(true);
    try {
      const created = await uploadGalleryMedia({ file, type: 'image' });
      await queryClient.invalidateQueries({ queryKey: galleryKeys.lists() });
      pick(created.url);
      toast.success('Image uploaded.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not upload the image.');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="scrim fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-picker-title"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-lg"
        style={{ background: 'var(--admin-card)', boxShadow: 'var(--elevation-overlay)' }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="flex items-center justify-between gap-3 px-4 py-3"
          style={{ borderBottom: '1px solid var(--admin-border)' }}
        >
          <h3 id="media-picker-title" className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
            {title}
          </h3>
          <div className="flex items-center gap-2">
            <label
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold"
              style={{ border: '1px dashed var(--admin-border)', color: 'var(--admin-accent)' }}
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              {busy ? 'Uploading…' : 'Upload image'}
              <input
                type="file"
                accept={IMAGE_ACCEPT}
                className="sr-only"
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  void onFile(file);
                }}
              />
            </label>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="grid h-7 w-7 place-items-center rounded-md disabled:opacity-50"
              style={{ color: 'var(--admin-text-secondary)', border: '1px solid var(--admin-border)' }}
              aria-label="Close gallery"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="space-y-3 overflow-y-auto p-4">
          {galleryQuery.isPending ? (
            <p className="py-8 text-center text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>Loading gallery…</p>
          ) : galleryQuery.isError ? (
            <p className="py-8 text-center text-xs font-medium" style={{ color: 'var(--admin-danger)' }}>Could not load gallery.</p>
          ) : items.length === 0 ? (
            <div className="rounded-lg px-4 py-8 text-center" style={{ border: '1px dashed var(--admin-border)' }}>
              <ImageIcon size={24} aria-hidden="true" className="mx-auto mb-2" style={{ color: 'var(--admin-text-muted)' }} />
              <p className="text-xs font-medium" style={{ color: 'var(--admin-text-secondary)' }}>
                Upload an image or add one in Gallery first.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={busy}
                  onClick={() => pick(item.url)}
                  className="group overflow-hidden rounded-md text-left disabled:opacity-50"
                  style={{ border: '1px solid var(--admin-border)' }}
                  aria-label={item.title ? `Select ${item.title}` : 'Select image'}
                >
                  <RemoteImage
                    src={item.thumbnailUrl || item.url}
                    alt=""
                    width={160}
                    height={120}
                    className="h-16 w-full object-cover transition-opacity group-hover:opacity-90"
                  />
                </button>
              ))}
            </div>
          )}
          <AdminPagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={LIMIT}
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  );
}
