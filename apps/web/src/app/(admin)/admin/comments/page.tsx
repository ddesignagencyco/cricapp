'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { MessageSquare, Loader2, Trash2, Search, ExternalLink, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { listComments, deleteComment, type CommentItem } from '../../../../services/comments';
import Pagination from '../../../../components/admin/AdminPagination';
import { AdminPageHeader, LoadingState, EmptyState, ConfirmDialog, AdminInput } from '../../../../components/admin/AdminShared';
import { getInitials } from '../../../../utils/helpers';

export default function CommentsPage() {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [targetTypeFilter, setTargetTypeFilter] = useState<'all' | 'news' | 'match'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<CommentItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const limit = 20;

  const load = useCallback((p: number) => {
    setLoading(true);
    const filter = (targetTypeFilter === 'all' ? 'news' : targetTypeFilter) as any;
    listComments(filter, '', p, limit)
      .then((res) => {
        setComments(res.items || []);
        setTotalPages(res.totalPages || 1);
        setTotal(res.total || 0);
      })
      .catch(() => {
        setComments([]);
        setTotalPages(1);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [targetTypeFilter]);

  useEffect(() => {
    setPage(1);
  }, [targetTypeFilter]);

  useEffect(() => {
    load(page);
  }, [page, load]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await deleteComment(deleteTarget.id);
      setComments((list) => list.filter((c) => c.id !== deleteTarget.id));
      setTotal((t) => Math.max(0, t - 1));
      toast.success('Comment deleted.');
    } catch {
      toast.error('Could not delete comment.');
    } finally {
      setBusyId(null);
      setDeleteTarget(null);
    }
  };

  const filteredComments = comments.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const userObj = c.user as any;
    const username = (userObj?.username || '').toLowerCase();
    const displayName = (userObj?.displayName || '').toLowerCase();
    const email = (userObj?.email || '').toLowerCase();
    const body = (c.body || '').toLowerCase();
    const targetId = (c.targetId || '').toLowerCase();
    return username.includes(q) || displayName.includes(q) || email.includes(q) || body.includes(q) || targetId.includes(q);
  });

  const getTargetUrl = (targetType: string, targetId: string) => {
    if (targetType === 'news') return `/news/${targetId}`;
    if (targetType === 'match') return `/matches/${targetId}`;
    return null;
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Comments"
        subtitle="View and moderate all user comments across news stories and matches."
        badge={`${total} total`}
      />

      <div className="flex flex-col gap-3 rounded-lg p-3 md:flex-row md:items-center" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--admin-text-muted)' }} />
          <AdminInput
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by username, email, content, or target ID..."
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'news', 'match'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTargetTypeFilter(t)}
              className="rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{
                background: targetTypeFilter === t ? 'var(--admin-accent)' : 'var(--admin-input-bg)',
                color: targetTypeFilter === t ? '#fff' : 'var(--admin-text-secondary)',
                border: targetTypeFilter === t ? 'none' : '1px solid var(--admin-border)',
              }}
            >
              {t === 'all' ? 'All Targets' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : filteredComments.length === 0 ? (
        <EmptyState
          icon={<MessageSquare size={28} />}
          title="No comments found"
          message={searchQuery ? 'No comments match your current search query.' : 'Comments from users will appear here for moderation.'}
        />
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-table-header)' }}>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>User Details</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Comment</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Target</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Date & Time</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-right" style={{ color: 'var(--admin-text-secondary)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredComments.map((c) => {
                  const userObj = c.user as any;
                  const userName = userObj?.displayName || userObj?.username || 'Anonymous';
                  const userEmail = userObj?.email;
                  const targetUrl = getTargetUrl(c.targetType, c.targetId);

                  let h = 0;
                  for (let i = 0; i < userName.length; i++) h = userName.charCodeAt(i) + ((h << 5) - h);
                  const hue = Math.abs(h % 360);

                  return (
                    <tr
                      key={c.id}
                      style={{ borderBottom: '1px solid var(--admin-border)' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--admin-table-row-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* User Column */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {userObj?.avatarUrl ? (
                            <img
                              src={userObj.avatarUrl}
                              alt={userName}
                              className="h-8 w-8 rounded-full object-cover shrink-0"
                              style={{ border: '1px solid var(--admin-border)' }}
                            />
                          ) : (
                            <span
                              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                              style={{ backgroundImage: `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${(hue + 40) % 360}, 80%, 35%))` }}
                            >
                              {getInitials(userName)}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="font-extrabold text-xs leading-tight" style={{ color: 'var(--admin-text)' }}>
                              {userName}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                              {c.user?.username && <span>@{c.user.username}</span>}
                              {userEmail && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[150px]">{userEmail}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Comment Body */}
                      <td className="px-4 py-3 max-w-sm">
                        <p className="text-xs whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--admin-text)' }}>
                          {c.body}
                        </p>
                      </td>

                      {/* Target Info */}
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                            style={{
                              background: c.targetType === 'match' ? 'var(--admin-info-bg)' : 'var(--admin-warning-bg)',
                              color: c.targetType === 'match' ? 'var(--admin-info)' : 'var(--admin-warning)',
                            }}
                          >
                            {c.targetType}
                          </span>
                          <div className="font-mono text-xs flex items-center gap-1" style={{ color: 'var(--admin-text-muted)' }}>
                            <span className="truncate max-w-[140px]">{c.targetId}</span>
                            {targetUrl && (
                              <Link
                                href={targetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center hover:opacity-80"
                                style={{ color: 'var(--admin-accent)' }}
                                title="Open target in new tab"
                              >
                                <ExternalLink size={11} />
                              </Link>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--admin-text-secondary)' }}>
                        <div>{new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        <div className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
                          {new Date(c.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={busyId === c.id}
                          onClick={() => setDeleteTarget(c)}
                          className="grid h-7 w-7 place-items-center rounded-lg transition-colors ml-auto hover:bg-rose-500/10 hover:text-rose-500 disabled:opacity-50"
                          style={{ color: 'var(--admin-text-muted)' }}
                          title="Delete comment"
                        >
                          {busyId === c.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5" style={{ borderTop: '1px solid var(--admin-border)' }}>
            <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={!!busyId}
        danger
      />
    </div>
  );
}
