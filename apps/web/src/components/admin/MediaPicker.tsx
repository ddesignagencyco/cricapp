'use client';

import { useEffect, useRef, useState } from 'react';
import { ImageIcon, Loader2, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import RemoteImage from '../RemoteImage';
import {
  MEDIA_ACCEPT,
  readRecentMedia,
  uploadMedia,
  type RecentMedia,
} from '../../services/media';

interface MediaPickerProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  onSelect: (_url: string) => void;
}

export default function MediaPicker({
  open,
  title = 'Insert image',
  onClose,
  onSelect,
}: MediaPickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<RecentMedia[]>([]);

  useEffect(() => {
    if (!open) return;
    setItems(readRecentMedia());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [busy, onClose, open]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const uploaded = await uploadMedia(file);
      setItems(readRecentMedia());
      onSelect(uploaded.url);
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-picker-title"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg"
        style={{ background: 'var(--admin-card)', boxShadow: 'var(--admin-shadow-lg)' }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--admin-border)' }}
        >
          <h3 id="media-picker-title" className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
            {title}
          </h3>
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

        <div className="space-y-3 overflow-y-auto p-4">
          <label
            className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg px-4 py-6 text-center"
            style={{ border: '1px dashed var(--admin-border)', background: 'var(--admin-input-bg)' }}
          >
            {busy ? (
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--admin-accent)' }} />
            ) : (
              <Upload size={20} style={{ color: 'var(--admin-accent)' }} />
            )}
            <span className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
              {busy ? 'Uploading to Cloudinary…' : 'Upload a new image'}
            </span>
            <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              JPEG, PNG, WebP, GIF or AVIF. Max 10 MB.
            </span>
            <input
              ref={fileRef}
              type="file"
              accept={MEDIA_ACCEPT}
              className="sr-only"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                void onFile(file);
              }}
            />
          </label>

          {items.length === 0 ? (
            <div className="rounded-lg px-4 py-8 text-center" style={{ border: '1px dashed var(--admin-border)' }}>
              <ImageIcon size={24} className="mx-auto mb-2" style={{ color: 'var(--admin-text-muted)' }} />
              <p className="text-xs" style={{ color: 'var(--admin-text-secondary)' }}>
                Uploads stay in this browser so you can reuse Cloudinary URLs. There is no media list API.
              </p>
            </div>
          ) : (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>
                Recent uploads
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {items.map((item) => (
                  <button
                    key={item.publicId}
                    type="button"
                    disabled={busy}
                    onClick={() => onSelect(item.url)}
                    className="group overflow-hidden rounded-md text-left disabled:opacity-50"
                    style={{ border: '1px solid var(--admin-border)' }}
                    title={item.url}
                  >
                    <RemoteImage
                      src={item.url}
                      alt=""
                      width={240}
                      height={160}
                      className="h-20 w-full object-cover transition-opacity group-hover:opacity-90"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
