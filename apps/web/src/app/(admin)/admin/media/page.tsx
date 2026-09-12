'use client';

import { useEffect, useState } from 'react';
import { ImageIcon, Loader2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminPageHeader } from '../../../../components/admin/AdminShared';
import RemoteImage from '../../../../components/RemoteImage';
import {
  MEDIA_ACCEPT,
  readRecentMedia,
  uploadMedia,
  type RecentMedia,
} from '../../../../services/media';

export default function MediaPage() {
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<RecentMedia[]>([]);

  useEffect(() => {
    setItems(readRecentMedia());
  }, []);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      await uploadMedia(file);
      setItems(readRecentMedia());
      toast.success('Image uploaded.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not upload the image.';
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Media Library"
        subtitle="Upload article images to Cloudinary via POST /admin/media/upload. Recent files stay in this browser."
      />

      <label
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg px-4 py-10 text-center"
        style={{ border: '1px dashed var(--admin-border)', background: 'var(--admin-card)' }}
      >
        {busy ? <Loader2 size={22} className="animate-spin" style={{ color: 'var(--admin-accent)' }} /> : <Upload size={22} style={{ color: 'var(--admin-accent)' }} />}
        <span className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
          {busy ? 'Uploading…' : 'Choose an image'}
        </span>
        <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
          JPEG, PNG, WebP, GIF or AVIF. Max 10 MB.
        </span>
        <input
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
        <div className="rounded-lg p-8 text-center" style={{ border: '1px dashed var(--admin-border)', background: 'var(--admin-card)' }}>
          <ImageIcon size={28} className="mx-auto mb-2" style={{ color: 'var(--admin-text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
            There is no list endpoint. After you upload, the Cloudinary URL is stored here so the news editor can insert it.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.publicId} className="rounded-lg p-3" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
              <div className="overflow-hidden rounded" style={{ border: '1px solid var(--admin-border)' }}>
                <RemoteImage src={item.url} alt="" width={640} height={200} className="h-36 w-full object-cover" />
              </div>
              <p className="mt-2 break-all text-xs" style={{ color: 'var(--admin-text-secondary)' }}>{item.url}</p>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(item.url);
                  toast.success('URL copied.');
                }}
                className="mt-2 rounded-md px-3 py-1.5 text-xs font-bold text-white"
                style={{ background: 'var(--admin-accent)' }}
              >
                Copy URL
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
