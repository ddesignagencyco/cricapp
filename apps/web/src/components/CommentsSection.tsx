'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flag, Flame, Loader2, MessageSquare, SmilePlus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ReactionBar from './ReactionBar';
import { CommentListSkeleton } from './skeletons/Skeletons';
import {
  createComment,
  deleteComment,
  getReactionCounts,
  listComments,
  reportComment,
  toggleReaction,
  type CommentItem,
  type CommentTarget,
  type ReactionTarget,
} from '../services/comments';
import { moderateComment } from '../services/admin';
import { ApiError } from '../services/api/client';
import { useAuth } from './AuthProvider';
import { ConfirmDialog } from './admin/AdminShared';
import ReportCommentDialog from './ReportCommentDialog';

interface CommentsSectionProps {
  targetType: CommentTarget;
  targetId: string;
}

function highlightedCommentId(): string {
  if (typeof window === 'undefined') return '';
  const queryId = new URLSearchParams(window.location.search).get('comment')?.trim();
  if (queryId) return queryId;
  const hash = window.location.hash.replace(/^#/, '').trim();
  return hash.startsWith('comment-') ? hash.slice('comment-'.length) : '';
}

export default function CommentsSection({ targetType, targetId }: CommentsSectionProps) {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const pathname = usePathname();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CommentItem | null>(null);
  const [reportTarget, setReportTarget] = useState<CommentItem | null>(null);
  const [reportedIds, setReportedIds] = useState<string[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, Record<string, number>>>({});
  const [highlightId, setHighlightId] = useState('');
  const requestedPageRef = useRef(0);

  const load = useCallback((nextPage = 1, append = false) => {
    if (!append) setLoading(true);
    setLoadError('');
    listComments(targetType, targetId, nextPage, 10)
      .then(async (r) => {
        setComments((prev) => (append ? [...prev, ...r.items] : r.items));
        setTotal(r.total);
        setTotalPages(r.totalPages);
        setPage(nextPage);
        const pairs = await Promise.all(
          r.items.map((comment) =>
            getReactionCounts('comment', comment.id)
              .then((res) => [comment.id, res.counts] as const)
              .catch(() => [comment.id, {}] as const),
          ),
        );
        setCommentCounts((prev) => {
          const next = append ? { ...prev } : {};
          for (const [id, nextCounts] of pairs) next[id] = nextCounts;
          return next;
        });
      })
      .catch(() => {
        if (!append) {
          setComments([]);
          setTotal(0);
          setLoadError('Could not load comments.');
        }
      })
      .finally(() => setLoading(false));
    getReactionCounts(targetType as ReactionTarget, targetId)
      .then((r) => setCounts(r.counts))
      .catch(() => setCounts({}));
  }, [targetType, targetId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const syncHighlight = () => setHighlightId(highlightedCommentId());
    syncHighlight();
    window.addEventListener('hashchange', syncHighlight);
    return () => window.removeEventListener('hashchange', syncHighlight);
  }, [pathname]);

  useEffect(() => {
    requestedPageRef.current = 0;
  }, [targetType, targetId, highlightId]);

  useEffect(() => {
    if (!highlightId || loading) return;
    const node = document.getElementById(`comment-${highlightId}`);
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const nextPage = page + 1;
    if (nextPage > totalPages || requestedPageRef.current >= nextPage) return;
    requestedPageRef.current = nextPage;
    load(nextPage, true);
  }, [highlightId, comments, loading, page, totalPages, load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) {
      toast.error('Comment is required.');
      return;
    }
    setSubmitting(true);
    try {
      await createComment(targetType, targetId, text);
      setBody('');
      toast.success('Comment posted.');
      load(1, false);
    } catch {
      toast.error('Could not post the comment.');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      const ownComment = user?.id === deleteTarget.userId;
      if (isAdmin && !ownComment) {
        await moderateComment(deleteTarget.id, 'deleted');
      } else {
        await deleteComment(deleteTarget.id);
      }
      setComments((list) => list.filter((c) => c.id !== deleteTarget.id));
      setTotal((t) => Math.max(0, t - 1));
      toast.success('Comment deleted.');
    } catch {
      toast.error('Could not delete the comment.');
    } finally {
      setBusyId(null);
      setDeleteTarget(null);
    }
  };

  const react = async (emoji: string) => {
    if (!isAuthenticated) {
      toast.error('Sign in to react.');
      return;
    }
    try {
      await toggleReaction(targetType as ReactionTarget, targetId, emoji);
      const updated = await getReactionCounts(targetType as ReactionTarget, targetId);
      setCounts(updated.counts);
    } catch {
      toast.error('Could not save the reaction.');
    }
  };

  const reactToComment = async (comment: CommentItem, emoji: string) => {
    if (!isAuthenticated) {
      toast.error('Sign in to react.');
      return;
    }
    try {
      await toggleReaction('comment', comment.id, emoji);
      const updated = await getReactionCounts('comment', comment.id);
      setCommentCounts((prev) => ({ ...prev, [comment.id]: updated.counts }));
    } catch {
      toast.error('Could not save the reaction.');
    }
  };

  const submitReport = async (reason: string) => {
    if (!reportTarget) return;
    setBusyId(reportTarget.id);
    try {
      await reportComment(reportTarget.id, reason);
      setReportedIds((ids) => (ids.includes(reportTarget.id) ? ids : [...ids, reportTarget.id]));
      toast.success('Comment reported.');
      setReportTarget(null);
    } catch (error) {
      const text = error instanceof ApiError ? error.message : 'Could not report this comment.';
      toast.error(text);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="rounded bg-card p-5 ring-1 ring-lborder sm:p-6">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold text-mtext">
          <MessageSquare size={16} className="text-accent" />
          Comments
          <span className="rounded bg-elevated px-2 py-0.5 text-xs font-semibold text-stext">{total}</span>
        </h2>
        <div className="overflow-visible rounded-md border border-lborder bg-elevated/70 px-3 py-2.5 sm:min-w-[280px]">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-stext">
            <SmilePlus size={12} className="text-accent" />
            Reactions
          </p>
          <ReactionBar counts={counts} onReact={react} />
        </div>
      </div>

      {isAuthenticated ? (
        <form onSubmit={submit} noValidate className="mb-5">
          <label htmlFor="comment-body" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stext">
            Comment <span className="text-danger">*</span>
          </label>
          <textarea
            id="comment-body"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={`Share your thoughts as ${user?.displayName || user?.username || 'a fan'}…`}
            maxLength={1000}
            className="w-full resize-none rounded bg-card px-3.5 py-2.5 text-sm text-mtext ring-1 ring-lborder outline-none transition-colors hover:ring-[var(--color-border-strong)] focus:ring-2 focus:ring-[var(--color-focus-ring)]/30"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs font-medium tabular-nums text-stext">{body.length}/1000</span>
            <button
              type="submit"
              disabled={submitting}
              className="btn-brand inline-flex items-center gap-2 rounded px-4 py-2 text-xs font-bold disabled:opacity-60"
            >
              {submitting ? <Loader2 size={13} aria-hidden="true" className="animate-spin" /> : <Flame size={13} aria-hidden="true" />}
              Post comment
            </button>
          </div>
        </form>
      ) : (
        <p className="mb-5 rounded bg-secondary px-4 py-3 text-center text-sm text-stext ring-1 ring-lborder">
          <Link
            href={`/login?returnTo=${encodeURIComponent(pathname || '/')}`}
            className="font-semibold text-accent underline underline-offset-2 hover:text-[var(--color-brand-hover)]"
          >
            Sign in
          </Link>{' '}
          to join the conversation.
        </p>
      )}

      {loading ? (
        <CommentListSkeleton />
      ) : loadError ? (
        <p role="alert" className="py-6 text-center text-sm font-semibold text-danger">{loadError}</p>
      ) : comments.length === 0 ? (
        <p className="py-6 text-center text-sm font-medium text-stext">No comments yet. Be the first to share your take.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li
              id={`comment-${comment.id}`}
              className={`scroll-mt-28 rounded bg-secondary p-3.5 ring-1 ${
                highlightId === comment.id
                  ? 'ring-2 ring-accent ring-offset-2 ring-offset-card'
                  : 'ring-lborder'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  {(() => {
                    const displayName = comment.user?.displayName || comment.user?.username || '??';
                    const raw = (comment.user?.displayName || comment.user?.username || '').trim();
                    let h = 0;
                    for (let i = 0; i < raw.length; i++) h = raw.charCodeAt(i) + ((h << 5) - h);
                    const hue = Math.abs(h % 360);
                    return (
                      <span
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
                        style={{ backgroundImage: `linear-gradient(135deg, hsl(${hue}, 75%, 50%), hsl(${(hue + 40) % 360}, 85%, 35%))` }}
                      >
                        {displayName.slice(0, 2).toUpperCase()}
                      </span>
                    );
                  })()}
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-mtext">
                      {comment.user?.displayName || comment.user?.username || 'User'}
                    </p>
                    <p className="text-xs text-stext">
                      {new Date(comment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ·{' '}
                      {new Date(comment.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                {(isAdmin || user?.id === comment.userId) && (
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(comment)}
                    disabled={busyId === comment.id}
                    className="shrink-0 rounded p-1.5 text-danger hover:bg-[var(--color-row-hover)] disabled:opacity-50"
                    aria-label="Delete comment"
                  >
                    {busyId === comment.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                )}
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-mtext">{comment.body}</p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 overflow-visible border-t border-lborder/70 pt-2.5">
                <ReactionBar
                  size="sm"
                  counts={commentCounts[comment.id]}
                  onReact={(emoji) => reactToComment(comment, emoji)}
                />
                {isAuthenticated && !isAdmin && user?.id !== comment.userId && (
                  <button
                    type="button"
                    onClick={() => {
                      if (reportedIds.includes(comment.id)) return;
                      setReportTarget(comment);
                    }}
                    disabled={reportedIds.includes(comment.id) || busyId === comment.id}
                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-stext hover:text-danger disabled:cursor-default disabled:opacity-70 disabled:hover:text-stext"
                  >
                    <Flag size={11} /> {reportedIds.includes(comment.id) ? 'Reported' : 'Report'}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {page < totalPages && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => load(page + 1, true)}
            disabled={loading}
            className="rounded-md border border-lborder bg-elevated px-4 py-2 text-xs font-semibold text-mtext disabled:opacity-60"
          >
            {loading ? 'Loading…' : 'Load more comments'}
          </button>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete comment"
        message={
          isAdmin && deleteTarget && user?.id !== deleteTarget.userId
            ? 'Remove this comment from the thread? Readers will no longer see it.'
            : 'Are you sure you want to delete this comment? This cannot be undone.'
        }
        confirmLabel="Delete"
        onConfirm={remove}
        onCancel={() => setDeleteTarget(null)}
        loading={!!busyId}
        danger
      />
      <ReportCommentDialog
        open={!!reportTarget}
        commentBody={reportTarget?.body}
        loading={!!busyId && !!reportTarget}
        onCancel={() => {
          if (!busyId) setReportTarget(null);
        }}
        onSubmit={submitReport}
      />
    </section>
  );
}
