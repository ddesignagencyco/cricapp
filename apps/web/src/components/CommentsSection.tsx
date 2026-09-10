'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Flame, Loader2, MessageSquare, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createComment,
  deleteComment,
  getReactionCounts,
  listComments,
  toggleReaction,
  type CommentItem,
  type CommentTarget,
  type ReactionTarget,
} from '../services/comments';
import { useAuth } from './AuthProvider';
import { ConfirmDialog } from './admin/AdminShared';

interface CommentsSectionProps {
  targetType: CommentTarget;
  targetId: string;
}

const REACTIONS = ['🔥', '❤️', '👏', '😂'];

export default function CommentsSection({ targetType, targetId }: CommentsSectionProps) {
  const { user, isAuthenticated } = useAuth();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CommentItem | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const load = useCallback(() => {
    setLoading(true);
    listComments(targetType, targetId)
      .then((r) => {
        setComments(r.items);
        setTotal(r.total);
      })
      .catch(() => {
        // Silently handle load errors (e.g. backend offline or empty); don't spam toasts to user
        setComments([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
    getReactionCounts(targetType as ReactionTarget, targetId)
      .then((r) => setCounts(r.counts))
      .catch(() => setCounts({}));
  }, [targetType, targetId]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setSubmitting(true);
    try {
      await createComment(targetType, targetId, text);
      setBody('');
      toast.success('Comment posted.');
      load();
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
      await deleteComment(deleteTarget.id);
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

  return (
    <section className="rounded bg-card p-5 ring-1 ring-lborder sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-mtext">
          <MessageSquare size={16} className="text-accent" />
          Comments
          <span className="rounded bg-elevated px-2 py-0.5 text-xs font-semibold text-stext">{total}</span>
        </h2>
        <div className="flex items-center gap-1">
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => react(emoji)}
              className="flex items-center gap-1 rounded-full bg-elevated px-2 py-1 text-xs ring-1 ring-lborder transition hover:ring-accent/40"
              aria-label={`React with ${emoji}`}
            >
              <span>{emoji}</span>
              {counts[emoji] ? <span className="text-xs font-bold text-stext">{counts[emoji]}</span> : null}
            </button>
          ))}
        </div>
      </div>

      {isAuthenticated ? (
        <form onSubmit={submit} className="mb-5">
          <textarea
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={`Share your thoughts as ${user?.displayName || user?.username || 'a fan'}…`}
            maxLength={1000}
            className="w-full resize-none rounded bg-elevated px-3.5 py-2.5 text-sm text-mtext ring-1 ring-lborder outline-none transition focus:ring-2 focus:ring-accent/60"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-stext">{body.length}/1000</span>
            <button
              type="submit"
              disabled={submitting || !body.trim()}
              className="inline-flex items-center gap-2 rounded bg-accent px-4 py-2 text-xs font-bold text-white transition hover:bg-accent2 disabled:opacity-60"
            >
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Flame size={13} />}
              Post comment
            </button>
          </div>
        </form>
      ) : (
        <p className="mb-5 rounded bg-elevated px-4 py-3 text-center text-sm text-stext ring-1 ring-lborder">
          <Link href={`/login?returnTo=${typeof window !== 'undefined' ? window.location.pathname : '/'}`} className="font-semibold text-accent hover:text-accent2">
            Sign in
          </Link>{' '}
          to join the conversation.
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-accent" /></div>
      ) : comments.length === 0 ? (
        <p className="py-6 text-center text-sm text-stext">No comments yet. Be the first to share your take.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded bg-elevated/60 p-3.5 ring-1 ring-lborder/60">
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
                {user?.id === comment.userId && (
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(comment)}
                    disabled={busyId === comment.id}
                    className="shrink-0 rounded p-1.5 text-danger hover:bg-card disabled:opacity-50"
                    aria-label="Delete comment"
                  >
                    {busyId === comment.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                )}
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-mtext">{comment.body}</p>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete comment"
        message="Are you sure you want to delete this comment? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={remove}
        onCancel={() => setDeleteTarget(null)}
        loading={!!busyId}
        danger
      />
    </section>
  );
}
