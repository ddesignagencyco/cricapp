'use client';

import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Rss,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createRssFeed,
  deleteRssFeed,
  fetchRssFeeds,
  previewRssFeed,
  syncRssFeed,
  updateRssFeed,
  type RssFeedPayload,
  type RssFeedSourceAdmin,
  type RssPreviewResponse,
  type RssRewriteMode,
} from '../../services/rssFeedsAdmin';
import { fetchNewsCategories, type NewsCategory } from '../../services/newsAdmin';
import { AdminField, AdminInput, ConfirmDialog, LoadingState } from './AdminShared';

function parseCsvKeywords(raw: string): string[] {
  return [...new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))];
}

interface FormState {
  name: string;
  url: string;
  categoryId: string;
  includeKeywordsText: string;
  excludeKeywordsText: string;
  rewriteMode: RssRewriteMode;
  autoPublish: boolean;
  language: 'en' | 'ur';
  pollIntervalMinutes: number;
  maxItemsPerPoll: number;
  enabled: boolean;
}

const EMPTY_FORM: FormState = {
  name: '',
  url: '',
  categoryId: '',
  includeKeywordsText: 'PSL, Pakistan, ICC, T20, Test, ODI',
  excludeKeywordsText: 'betting, sponsored, promo',
  rewriteMode: 'ai_rewrite',
  autoPublish: false,
  language: 'en',
  pollIntervalMinutes: 30,
  maxItemsPerPoll: 10,
  enabled: true,
};

export default function RssFeedManager() {
  const [feeds, setFeeds] = useState<RssFeedSourceAdmin[]>([]);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<RssPreviewResponse | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RssFeedSourceAdmin | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetchRssFeeds().catch(() => [] as RssFeedSourceAdmin[]),
      fetchNewsCategories().catch(() => [] as NewsCategory[]),
    ])
      .then(([list, cats]) => {
        setFeeds(list);
        setCategories(cats);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setPreview(null);
    setFormOpen(true);
  };

  const openEdit = (feed: RssFeedSourceAdmin) => {
    setEditingId(feed.id);
    setForm({
      name: feed.name,
      url: feed.url,
      categoryId: feed.categoryId || '',
      includeKeywordsText: feed.includeKeywords.join(', '),
      excludeKeywordsText: feed.excludeKeywords.join(', '),
      rewriteMode: feed.rewriteMode,
      autoPublish: feed.autoPublish,
      language: feed.language === 'ur' ? 'ur' : 'en',
      pollIntervalMinutes: feed.pollIntervalMinutes,
      maxItemsPerPoll: feed.maxItemsPerPoll,
      enabled: feed.enabled,
    });
    setPreview(null);
    setFormOpen(true);
  };

  const handlePreview = async () => {
    if (!form.url.trim()) {
      toast.error('Enter a feed URL first.');
      return;
    }
    setPreviewing(true);
    setPreview(null);
    try {
      const res = await previewRssFeed({
        url: form.url.trim(),
        includeKeywords: parseCsvKeywords(form.includeKeywordsText),
        excludeKeywords: parseCsvKeywords(form.excludeKeywordsText),
        limit: 12,
      });
      setPreview(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to preview feed.');
    } finally {
      setPreviewing(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.url.trim()) {
      toast.error('Feed name and URL are required.');
      return;
    }
    setSaving(true);
    const payload: RssFeedPayload = {
      name: form.name.trim(),
      url: form.url.trim(),
      categoryId: form.categoryId || null,
      includeKeywords: parseCsvKeywords(form.includeKeywordsText),
      excludeKeywords: parseCsvKeywords(form.excludeKeywordsText),
      rewriteMode: form.rewriteMode,
      autoPublish: form.autoPublish,
      language: form.language,
      pollIntervalMinutes: Number(form.pollIntervalMinutes) || 30,
      maxItemsPerPoll: Number(form.maxItemsPerPoll) || 10,
      enabled: form.enabled,
    };
    try {
      if (editingId) {
        const updated = await updateRssFeed(editingId, payload);
        setFeeds((prev) => prev.map((f) => (f.id === editingId ? updated : f)));
        toast.success(`Updated "${updated.name}".`);
      } else {
        const created = await createRssFeed(payload);
        setFeeds((prev) => [created, ...prev]);
        toast.success(`Added RSS feed "${created.name}".`);
      }
      setFormOpen(false);
      setPreview(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save RSS feed.');
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async (feed: RssFeedSourceAdmin) => {
    setSyncingId(feed.id);
    try {
      const res = await syncRssFeed(feed.id);
      toast.success(
        `${res.name}: imported ${res.inserted} (${res.skippedFilter} filtered, ${res.skippedDuplicate} duplicates).`,
      );
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync failed.');
      load();
    } finally {
      setSyncingId(null);
    }
  };

  const handleToggleEnabled = async (feed: RssFeedSourceAdmin) => {
    try {
      const updated = await updateRssFeed(feed.id, { enabled: !feed.enabled });
      setFeeds((prev) => prev.map((f) => (f.id === feed.id ? updated : f)));
      toast.success(updated.enabled ? 'Feed enabled.' : 'Feed paused.');
    } catch {
      toast.error('Could not update feed status.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRssFeed(deleteTarget.id);
      setFeeds((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      toast.success(`Deleted "${deleteTarget.name}".`);
    } catch {
      toast.error('Could not delete RSS feed.');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold" style={{ color: 'var(--admin-text)' }}>
            <Rss size={20} style={{ color: 'var(--admin-accent)' }} />
            RSS Autoblogging Feeds
          </h1>
          <p className="mt-1 text-xs" style={{ color: 'var(--admin-text-secondary)' }}>
            Configure topic-filtered RSS/Atom sources, AI editorial rewriting, and draft or auto-publish rules.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3.5 py-2 text-xs font-semibold text-white hover:opacity-95"
        >
          <Plus size={15} />
          Add RSS Feed
        </button>
      </div>

      {formOpen && (
        <form
          onSubmit={handleSave}
          className="space-y-4 rounded-lg p-5"
          style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
              {editingId ? 'Edit RSS Feed' : 'New RSS Feed Source'}
            </h2>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded p-1"
              style={{ color: 'var(--admin-text-secondary)' }}
              aria-label="Close form"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <AdminField label="Feed Name">
              <AdminInput
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. ESPNcricinfo — Pakistan"
                required
              />
            </AdminField>
            <AdminField label="RSS / Atom Feed URL">
              <AdminInput
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://www.espncricinfo.com/rss/content/story/feeds/7.xml"
                required
              />
            </AdminField>
            <AdminField label="Include Topics / Keywords (comma-separated, empty = all)">
              <AdminInput
                value={form.includeKeywordsText}
                onChange={(e) => setForm({ ...form, includeKeywordsText: e.target.value })}
                placeholder="PSL, Pakistan, Babar, ICC, World Cup"
              />
            </AdminField>
            <AdminField label="Exclude Keywords (comma-separated)">
              <AdminInput
                value={form.excludeKeywordsText}
                onChange={(e) => setForm({ ...form, excludeKeywordsText: e.target.value })}
                placeholder="betting, sponsored, promo"
              />
            </AdminField>
            <AdminField label="Target Category">
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full rounded-md px-3 py-2 text-sm"
                style={{
                  background: 'var(--admin-input-bg)',
                  border: '1px solid var(--admin-border)',
                  color: 'var(--admin-text)',
                }}
              >
                <option value="">— Default / Uncategorized —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </AdminField>
            <AdminField label="Content Mode">
              <select
                value={form.rewriteMode}
                onChange={(e) => setForm({ ...form, rewriteMode: e.target.value as RssRewriteMode })}
                className="w-full rounded-md px-3 py-2 text-sm"
                style={{
                  background: 'var(--admin-input-bg)',
                  border: '1px solid var(--admin-border)',
                  color: 'var(--admin-text)',
                }}
              >
                <option value="ai_rewrite">AI Original Rewrite (AdSense-safe, recommended)</option>
                <option value="summary_attribution">Summary + Source Attribution</option>
                <option value="raw">Sanitized Feed HTML + Attribution</option>
              </select>
            </AdminField>
            <AdminField label="Poll Interval (minutes)">
              <AdminInput
                type="number"
                min={5}
                max={1440}
                value={form.pollIntervalMinutes}
                onChange={(e) => setForm({ ...form, pollIntervalMinutes: Number(e.target.value) })}
              />
            </AdminField>
            <AdminField label="Max Items Per Poll">
              <AdminInput
                type="number"
                min={1}
                max={50}
                value={form.maxItemsPerPoll}
                onChange={(e) => setForm({ ...form, maxItemsPerPoll: Number(e.target.value) })}
              />
            </AdminField>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-1 text-xs" style={{ color: 'var(--admin-text)' }}>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={form.autoPublish}
                onChange={(e) => setForm({ ...form, autoPublish: e.target.checked })}
              />
              Auto-publish immediately (uncheck to save as Draft for review)
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              />
              Enabled
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={handlePreview}
              disabled={previewing}
              className="inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-semibold"
              style={{
                border: '1px solid var(--admin-border)',
                color: 'var(--admin-text)',
              }}
            >
              {previewing ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
              Test &amp; Preview Filter
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {editingId ? 'Save Changes' : 'Create Feed'}
            </button>
          </div>

          {preview && (
            <div
              className="mt-4 space-y-2 rounded-md p-3.5"
              style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}
            >
              <p className="text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>
                Preview: {preview.matchedCount} matched / {preview.skippedCount} skipped (of {preview.totalInFeed} in feed)
              </p>
              <ul className="max-h-64 space-y-1.5 overflow-y-auto text-xs">
                {preview.items.map((item, idx) => (
                  <li
                    key={`${item.link}-${idx}`}
                    className="flex items-start justify-between gap-2 rounded p-2"
                    style={{ background: 'var(--admin-card)' }}
                  >
                    <div className="min-w-0">
                      <p className="font-medium" style={{ color: 'var(--admin-text)' }}>
                        {item.title}
                      </p>
                      {item.matchedKeywords.length > 0 && (
                        <p className="mt-0.5 text-[11px] text-accent">
                          Matched: {item.matchedKeywords.join(', ')}
                        </p>
                      )}
                      {item.excludedBy && (
                        <p className="mt-0.5 text-[11px] text-danger">Excluded by: {item.excludedBy}</p>
                      )}
                    </div>
                    {item.matched ? (
                      <CheckCircle2 size={16} className="shrink-0 text-accent" />
                    ) : (
                      <XCircle size={16} className="shrink-0 opacity-40" />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </form>
      )}

      {loading ? (
        <LoadingState />
      ) : feeds.length === 0 ? (
        <div
          className="rounded-lg p-8 text-center text-sm"
          style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)', color: 'var(--admin-text-secondary)' }}
        >
          No RSS feeds configured yet. Click <strong>Add RSS Feed</strong> to start topic-filtered autoblogging.
        </div>
      ) : (
        <div className="space-y-3">
          {feeds.map((feed) => (
            <div
              key={feed.id}
              className="flex flex-col justify-between gap-3 rounded-lg p-4 sm:flex-row sm:items-center"
              style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-sm" style={{ color: 'var(--admin-text)' }}>
                    {feed.name}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      feed.enabled ? 'bg-accent/15 text-accent' : 'bg-secondary text-stext'
                    }`}
                  >
                    {feed.enabled ? 'Active' : 'Paused'}
                  </span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-stext">
                    {feed.autoPublish ? 'Auto-Publish' : 'Draft Queue'}
                  </span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-stext">
                    {feed.rewriteMode}
                  </span>
                  {feed.category && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-stext">
                      {feed.category.name}
                    </span>
                  )}
                </div>
                <p className="truncate text-xs" style={{ color: 'var(--admin-text-secondary)' }}>
                  {feed.url}
                </p>
                {feed.includeKeywords.length > 0 && (
                  <p className="text-[11px]" style={{ color: 'var(--admin-text-secondary)' }}>
                    Topics: <strong>{feed.includeKeywords.join(', ')}</strong>
                  </p>
                )}
                <p className="text-[11px]" style={{ color: 'var(--admin-text-secondary)' }}>
                  Imported: <strong>{feed.articlesImported}</strong> · Every {feed.pollIntervalMinutes}m
                  {feed.lastSyncedAt ? ` · Last sync: ${new Date(feed.lastSyncedAt).toLocaleString()}` : ''}
                  {feed.lastStatus === 'error' && feed.lastError ? ` · Error: ${feed.lastError}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSync(feed)}
                  disabled={syncingId === feed.id}
                  className="inline-flex items-center gap-1 rounded-md bg-brand px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                >
                  <RefreshCw size={13} className={syncingId === feed.id ? 'animate-spin' : ''} />
                  Sync Now
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleEnabled(feed)}
                  className="rounded-md px-2.5 py-1.5 text-xs font-semibold"
                  style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
                >
                  {feed.enabled ? 'Pause' : 'Enable'}
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(feed)}
                  className="rounded-md p-1.5"
                  style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
                  aria-label={`Edit ${feed.name}`}
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(feed)}
                  className="rounded-md p-1.5 text-danger"
                  style={{ border: '1px solid var(--admin-border)' }}
                  aria-label={`Delete ${feed.name}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete RSS Feed"
        message={`Remove "${deleteTarget?.name}"? Already imported articles will remain in News.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        danger
      />
    </div>
  );
}
