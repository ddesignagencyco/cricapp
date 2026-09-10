'use client';

import { ImageIcon, Upload } from 'lucide-react';
import { AdminPageHeader, EmptyState } from '../../../../components/admin/AdminShared';

export default function MediaPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Media Library"
        subtitle="Upload and manage images and media files."
        actions={
          <button type="button" disabled className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold cursor-not-allowed" style={{ background: 'var(--admin-input-bg)', color: 'var(--admin-text-muted)' }}>
            <Upload size={16} /> Upload (Coming Soon)
          </button>
        }
      />

      <div className="rounded-xl p-5" style={{ border: '1px solid var(--admin-warning)', background: 'var(--admin-warning-bg)' }}>
        <h3 className="text-sm font-bold" style={{ color: 'var(--admin-warning)' }}>Backend API Required</h3>
        <p className="mt-1 text-sm" style={{ color: 'var(--admin-warning)' }}>
          The media library requires a file upload endpoint on the backend. Currently, the API does not support file uploads.
          Articles use external image URLs (e.g. Unsplash, Pexels) for featured images.
        </p>
        <div className="mt-3 rounded-lg p-3 text-xs" style={{ border: '1px solid var(--admin-warning)', background: 'var(--admin-card)', color: 'var(--admin-warning)' }}>
          <p className="font-semibold">Required backend endpoints:</p>
          <ul className="mt-1 list-disc pl-4 space-y-0.5">
            <li>POST /api/media/upload — Upload file with FormData</li>
            <li>GET /api/media — List uploaded media with pagination</li>
            <li>DELETE /api/media/:id — Delete media file</li>
          </ul>
        </div>
      </div>

      <EmptyState icon={<ImageIcon size={32} />} title="No media uploads yet" message="Once the backend upload API is implemented, you'll be able to upload and manage images here." />
    </div>
  );
}
