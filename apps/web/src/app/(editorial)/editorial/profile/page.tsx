'use client';

import { useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Save, Upload } from 'lucide-react';
import {
  AdminAvatar,
  AdminField,
  AdminInput,
  AdminPageHeader,
  LoadingState,
} from '../../../../components/admin/AdminShared';
import { useAuth } from '../../../../components/AuthProvider';
import { apiPost } from '../../../../services/api/client';
import {
  fetchMyAuthorProfile,
  upsertMyAuthorProfile,
} from '../../../../services/editorialStudio';

export default function EditorialProfilePage() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchMyAuthorProfile()
      .then((profile) => {
        if (profile) {
          setName(profile.name || '');
          setSlug(profile.slug || '');
          setBio(profile.bio || '');
          setAvatarUrl(profile.avatarUrl || '');
        } else if (user) {
          setName(user.displayName || user.username || '');
          setAvatarUrl(user.avatarUrl || '');
        }
      })
      .catch(() => toast.error('Could not load author profile.'))
      .finally(() => setLoading(false));
  }, [user]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await apiPost<{ url: string }>('/admin/media/upload', body);
      setAvatarUrl(res.url);
      toast.success('Avatar uploaded.');
    } catch {
      toast.error('Image upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Author display name is required.');
      return;
    }
    setSaving(true);
    try {
      const saved = await upsertMyAuthorProfile({
        name: name.trim(),
        slug: slug.trim() || undefined,
        bio: bio.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
      });
      setSlug(saved.slug);
      await refresh();
      toast.success('Author profile saved.');
    } catch {
      toast.error('Could not save author profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <AdminPageHeader
        title="Author Profile"
        subtitle="Your public byline, bio, and avatar shown on your published articles."
      />

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg p-5"
        style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
      >
        <div className="flex items-center gap-4">
          <AdminAvatar name={name || 'Author'} src={avatarUrl || null} size={56} />
          <label
            className="inline-flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-colors"
            style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-secondary)' }}
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? 'Uploading...' : 'Upload Avatar'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleUpload(f);
              }}
            />
          </label>
        </div>

        <AdminField label="Byline Name" required>
          <AdminInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ayesha Khan"
          />
        </AdminField>

        <AdminField label="Public Slug" hint="Used in /authors/your-slug URL">
          <AdminInput
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="ayesha-khan"
          />
        </AdminField>

        <AdminField label="Avatar URL">
          <AdminInput
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
          />
        </AdminField>

        <AdminField label="Author Bio">
          <textarea
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Cricket journalist covering PSL, Pakistan national team, and domestic tournaments."
            className="w-full rounded-md px-3 py-2 text-sm outline-none"
            style={{
              border: '1px solid var(--admin-border)',
              background: 'var(--admin-input-bg)',
              color: 'var(--admin-text)',
            }}
          />
        </AdminField>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-brand inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-bold disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Profile
          </button>
        </div>
      </form>
    </div>
  );
}
