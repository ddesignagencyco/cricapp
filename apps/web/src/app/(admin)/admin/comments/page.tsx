'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Check, EyeOff, MessageSquare, Trash2, X } from 'lucide-react';
import {
  AdminPageHeader,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  StatCard,
} from '../../../../components/admin/AdminShared';
import {
  fetchReportedComments,
  moderateComment,
  resolveReport,
  type ReportedComment,
} from '../../../../services/admin';

type CommentStatus = 'approved' | 'hidden' | 'deleted';
type ReportStatus = 'resolved' | 'dismissed';

function targetHref(type?: string, id?: string): string | null {
  if (!type || !id) return null;
  if (type === 'news') return `/news/${id}`;
  if (type === 'match') return `/matches/${id}`;
  return null;
}

function formatWhen(value?: string | null): string {
  if (!value) return 'Unknown time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function statusLabel(status?: string): string {
  if (status === 'hidden') return 'Hidden';
  if (status === 'deleted') return 'Deleted';
  return 'Visible';
}

export default function CommentsPage() {
  const [reports, setReports] = useState<ReportedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReportedComment | null>(null);

  const load = () => {
    setLoading(true);
    setError(false);
    fetchReportedComments()
      .then(setReports)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const reasonCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const report of reports) {
      const key = report.reason.split(':')[0].trim() || 'other';
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [reports]);

  const finish = async (
    report: ReportedComment,
    commentStatus: CommentStatus | null,
    reportStatus: ReportStatus,
    success: string
  ) => {
    setBusyId(report.id);
    try {
      if (commentStatus && report.comment) {
        await moderateComment(report.comment.id, commentStatus);
      }
      await resolveReport(report.id, reportStatus);
      setReports((list) => list.filter((item) => item.id !== report.id));
      toast.success(success);
    } catch {
      toast.error('Could not update this report.');
    } finally {
      setBusyId(null);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Comment moderation"
        subtitle="Review reports from the comment section. Keep, hide or delete the comment, or dismiss the report."
      />

      {!loading && !error && (
        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard label="Spam" value={reasonCounts.get('spam') || 0} icon={<MessageSquare size={14} />} />
          <StatCard
            label="Other reasons"
            value={Math.max(0, reports.length - (reasonCounts.get('spam') || 0))}
            icon={<EyeOff size={14} />}
          />
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message="Could not load reported comments." onRetry={load} />
      ) : reports.length === 0 ? (
        <EmptyState title="No pending reports" message="Reported comments will appear here for review." />
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const href = targetHref(report.comment?.targetType, report.comment?.targetId);
            const busy = busyId === report.id;
            return (
              <article
                key={report.id}
                className="rounded-lg p-4"
                style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                        style={{ background: 'var(--admin-warning-bg)', color: 'var(--admin-warning)' }}
                      >
                        {report.reason}
                      </span>
                      <span className="text-[11px] font-semibold" style={{ color: 'var(--admin-text-muted)' }}>
                        Comment {statusLabel(report.comment?.status)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--admin-text)' }}>
                      {report.comment?.body || 'Comment missing'}
                    </p>
                    <p className="mt-2 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                      {report.comment?.user?.username || 'Unknown'}
                      {report.comment?.user?.email ? ` · ${report.comment.user.email}` : ''}
                      {' · '}
                      {report.comment?.targetType}/{report.comment?.targetId}
                      {' · '}
                      Reported {formatWhen(report.createdAt)}
                    </p>
                    {href && (
                      <Link
                        href={href}
                        className="mt-2 inline-block text-xs font-semibold"
                        style={{ color: 'var(--admin-accent)' }}
                      >
                        Open {report.comment?.targetType} →
                      </Link>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => finish(report, 'approved', 'resolved', 'Comment kept visible.')}
                    className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                    style={{ background: 'var(--admin-success)' }}
                  >
                    <Check size={12} /> Keep visible
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => finish(report, 'hidden', 'resolved', 'Comment hidden.')}
                    className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                    style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
                  >
                    <EyeOff size={12} /> Hide
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setDeleteTarget(report)}
                    className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                    style={{ background: 'var(--admin-danger)' }}
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => finish(report, null, 'dismissed', 'Report dismissed.')}
                    className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                    style={{ color: 'var(--admin-text-secondary)' }}
                  >
                    <X size={12} /> Dismiss report
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete comment"
        message="This marks the comment as deleted so it no longer appears publicly. The report will be marked resolved."
        confirmLabel="Delete"
        danger
        loading={!!busyId}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) finish(deleteTarget, 'deleted', 'resolved', 'Comment deleted.');
        }}
      />
    </div>
  );
}
