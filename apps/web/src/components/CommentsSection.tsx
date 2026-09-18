'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flag, Loader2, MessageSquare, Send, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ReactionBar from './ReactionBar';
import { CommentListSkeleton } from './skeletons/Skeletons';
import { getInitials } from '../utils/helpers';
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

  const composerName = user?.displayName || user?.username || 'a fan';

  return (
    <section className="rounded-md border border-lborder bg-card p-3.5 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-mtext">
          <MessageSquare size={15} className="text-accent" />
          Comments
          <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-stext">{total}</span>
        </h2>
        <ReactionBar size="xs" counts={counts} onReact={react} />
      </div>

      {isAuthenticated ? (
        <form onSubmit={submit} noValidate className="mb-3 rounded-md border border-lborder bg-secondary/50 p-2.5">
          <div className="flex items-start gap-2.5">
            <CommentAvatar name={composerName} />
            <label htmlFor="comment-body" className="sr-only">
              Comment
            </label>
            <textarea
              id="comment-body"
              rows={2}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={`Share your thoughts as ${composerName}…`}
              maxLength={1000}
              className="min-h-[52px] w-full resize-none bg-transparent text-sm leading-snug text-mtext shadow-none outline-none ring-0 placeholder:text-stext focus:border-transparent focus:outline-none focus:ring-0 focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-0"
            />
          </div>
          <div className="mt-2 flex items-center justify-end gap-2.5">
            <span className="text-[11px] font-medium tabular-nums text-stext">{body.length}/1000</span>
            <button
              type="submit"
              disabled={submitting || !body.trim()}
              className="btn-brand inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold disabled:opacity-60"
            >
              {submitting ? <Loader2 size={12} aria-hidden="true" className="animate-spin" /> : <Send size={12} aria-hidden="true" />}
              Post
            </button>
          </div>
        </form>
      ) : (
        <p className="mb-3 rounded-md bg-secondary px-3 py-2 text-center text-xs text-stext">
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
        <CommentListSkeleton count={2} />
      ) : loadError ? (
        <p role="alert" className="py-3 text-center text-xs font-semibold text-danger">{loadError}</p>
      ) : comments.length === 0 ? (
        <p className="py-3 text-center text-xs text-stext">No comments yet. Be the first to share your take.</p>
      ) : (
        <ul className="divide-y divide-lborder">
          {comments.map((comment) => {
            const name = comment.user?.displayName || comment.user?.username || 'User';
            return (
              <li
                key={comment.id}
                id={`comment-${comment.id}`}
                className={`scroll-mt-28 py-3 first:pt-1 last:pb-0 ${
                  highlightId === comment.id ? 'rounded-md ring-2 ring-accent ring-offset-2 ring-offset-card' : ''
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <CommentAvatar name={name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-mtext">{name}</p>
                        <p className="text-[11px] text-stext">
                          {new Date(comment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {' · '}
                          {new Date(comment.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                      {(isAdmin || user?.id === comment.userId) && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(comment)}
                          disabled={busyId === comment.id}
                          className="shrink-0 rounded p-1 text-stext hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                          aria-label="Delete comment"
                        >
                          {busyId === comment.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </button>
                      )}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-snug text-mtext">{comment.body}</p>
                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                      <ReactionBar
                        size="xs"
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
                          className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-[11px] text-stext hover:text-danger disabled:cursor-default disabled:opacity-70 disabled:hover:text-stext"
                        >
                          <Flag size={11} /> {reportedIds.includes(comment.id) ? 'Reported' : 'Report'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
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

function CommentAvatar({ name }: { name: string }) {
  const seed = name.trim() || '?';
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);
  return (
    <span
      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white"
      style={{ backgroundImage: `linear-gradient(135deg, hsl(${hue}, 68%, 46%), hsl(${(hue + 38) % 360}, 72%, 32%))` }}
      aria-hidden="true"
    >
      {getInitials(seed)}
    </span>
  );
}
