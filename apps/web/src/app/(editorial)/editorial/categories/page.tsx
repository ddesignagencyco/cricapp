'use client';

import { useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { FolderPlus, ShieldAlert, Tag, Trash2 } from 'lucide-react';
import {
  AdminInput,
  AdminPageHeader,
  ConfirmDialog,
  EmptyState,
  LoadingState,
} from '../../../../components/admin/AdminShared';
import { useAuth } from '../../../../components/AuthProvider';
import {
  createEditorialCategory,
  deleteEditorialCategory,
  fetchEditorialCategories,
} from '../../../../services/editorialStudio';
import type { NewsCategory } from '../../../../services/newsAdmin';

export default function EditorialCategoriesPage() {
  const { isEditor } = useAuth();
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<NewsCategory | null>(null);

  useEffect(() => {
    fetchEditorialCategories()
      .then(setCategories)
      .catch(() => toast.error('Could not load categories.'))
      .finally(() => setLoading(false));
  }, []);

  if (!isEditor) {
    return (
      <div className="py-12 text-center">
        <ShieldAlert size={36} className="mx-auto" style={{ color: 'var(--admin-danger)' }} />
        <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
          Editor or Admin access required to manage categories.
        </p>
      </div>
    );
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const created = await createEditorialCategory({ name: trimmed });
      setCategories((prev) => [...prev, created]);
      setName('');
      toast.success(`Category "${created.name}" created.`);
    } catch {
      toast.error('Could not create category.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteEditorialCategory(confirmDelete.id);
      setCategories((prev) => prev.filter((c) => c.id !== confirmDelete.id));
      toast.success('Category deleted.');
    } catch {
      toast.error('Could not delete category.');
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <AdminPageHeader
        title="Editorial Categories"
        subtitle="Organize news stories into sections."
      />

      <form
        onSubmit={handleCreate}
        className="flex flex-col gap-2 rounded-lg p-4 sm:flex-row"
        style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
      >
        <AdminInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category name (e.g. PSL 2026)"
        />
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="btn-brand inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md px-4 py-2 text-xs font-bold disabled:opacity-50"
        >
          <FolderPlus size={14} />
          Add Category
        </button>
      </form>

      {loading ? (
        <LoadingState />
      ) : categories.length === 0 ? (
        <EmptyState icon={<Tag size={28} />} title="No categories yet" />
      ) : (
        <div
          className="divide-y rounded-lg"
          style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)', borderColor: 'var(--admin-border)' }}
        >
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                  {cat.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                  /{cat.slug}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmDelete(cat)}
                className="grid h-8 w-8 place-items-center rounded-md"
                style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-danger)' }}
                title="Delete category"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete category?"
        message={confirmDelete ? `Delete "${confirmDelete.name}"?` : ''}
        confirmLabel="Delete"
        danger
        onCancel={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
