'use client';

import { useEffect, useState } from 'react';
import { MessageSquare, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { listComments, deleteComment, type CommentItem } from '../../../../services/comments';
import Pagination from '../../../../components/admin/AdminPagination';
import { AdminPageHeader, LoadingState, EmptyState, ConfirmDialog } from '../../../../components/admin/AdminShared';

export default function CommentsPage() {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<CommentItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const limit = 20;

  const load = (p = page) => {
    setLoading(true);
    listComments('news', '', p, limit)
      .then((res: any) => {
        setComments(res.items || []);
        setTotalPages(res.totalPages || 1);
      })
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1); setPage(1); }, []);
  useEffect(() => { load(page); }, [page]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await deleteComment(deleteTarget.id);
      setComments((list) => list.filter((c) => c.id !== deleteTarget.id));
      toast.success('Comment deleted.');
    } catch { toast.error('Could not delete comment.'); }
    finally { setBusyId(null); setDeleteTarget(null); }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Comments" subtitle="View and moderate user comments." />

      {loading ? <LoadingState /> : comments.length === 0 ? (
        <EmptyState icon={<MessageSquare size={28} />} title="No comments yet" message="Comments from users will appear here for moderation." />
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-table-header)' }}>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>User</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Comment</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Target</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Date</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-right" style={{ color: 'var(--admin-text-secondary)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {comments.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--admin-border)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--admin-table-row-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-bold" style={{ color: 'var(--admin-text)' }}>{c.user?.displayName || c.user?.username || 'Anonymous'}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="max-w-xs truncate text-xs" style={{ color: 'var(--admin-text-secondary)' }}>{c.body}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full px-2 py-0.5 text-xs font-bold uppercase" style={{ background: 'var(--admin-input-bg)', color: 'var(--admin-text-secondary)' }}>{c.targetType}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs font-mono" style={{ color: 'var(--admin-text-secondary)' }}>
                      {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button type="button" disabled={busyId === c.id} onClick={() => setDeleteTarget(c)}
                        className="grid h-7 w-7 place-items-center rounded-lg disabled:opacity-50 transition-colors" style={{ color: 'var(--admin-text-muted)' }}>
                        {busyId === c.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5" style={{ borderTop: '1px solid var(--admin-border)' }}>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>
      )}

      <ConfirmDialog open={!!deleteTarget} title="Delete comment" message="Are you sure you want to delete this comment? This cannot be undone." confirmLabel="Delete" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={!!busyId} danger />
    </div>
  );
}
