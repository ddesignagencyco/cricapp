'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Check, EyeOff, ExternalLink, MessageSquare, Trash2, X } from 'lucide-react';
import {
  AdminAvatar,
  AdminPageHeader,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
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
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function reasonTone(reason: string) {
  const key = reason.split(':')[0].trim().toLowerCase();
  if (key === 'spam') return { background: 'var(--admin-warning-bg)', color: 'var(--admin-warning)' };
  if (key === 'hate' || key === 'harassment') return { background: 'var(--admin-danger-bg)', color: 'var(--admin-danger)' };
  return { background: 'var(--admin-info-bg)', color: 'var(--admin-info)' };
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
    <div className="space-y-5">
      <AdminPageHeader
        title="Comment moderation"
        subtitle="Review reports from the comment section. Keep, hide or delete the comment, or dismiss the report."
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message="Could not load reported comments." onRetry={load} />
      ) : reports.length === 0 ? (
        <EmptyState icon={<MessageSquare size={28} />} title="No pending reports" message="Reported comments will appear here for review." />
      ) : (
        <div className="overflow-hidden rounded-lg" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr style={{ background: 'var(--admin-table-header)', borderBottom: '1px solid var(--admin-border)' }}>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Reason</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Comment</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Author</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Target</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-right" style={{ color: 'var(--admin-text-secondary)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => {
                  const href = targetHref(report.comment?.targetType, report.comment?.targetId);
                  const author = report.comment?.user?.username || 'Unknown';
                  const busy = busyId === report.id;
                  return (
                    <tr
                      key={report.id}
                      style={{ borderBottom: '1px solid var(--admin-border)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--admin-table-row-hover)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td className="px-4 py-3 align-top">
                        <span className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase" style={reasonTone(report.reason)}>
                          {report.reason}
                        </span>
                        <p className="mt-1.5 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{formatWhen(report.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p className="max-w-md text-sm leading-relaxed" style={{ color: 'var(--admin-text)' }}>
                          {report.comment?.body || 'Comment missing'}
                        </p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center gap-2.5">
                          <AdminAvatar name={author} size={28} />
                          <div>
                            <p className="font-semibold" style={{ color: 'var(--admin-text)' }}>{author}</p>
                            <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{report.comment?.user?.email || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p className="text-xs font-semibold uppercase" style={{ color: 'var(--admin-text-secondary)' }}>
                          {report.comment?.targetType || '—'}
                        </p>
                        {href ? (
                          <Link href={href} className="mt-1 inline-flex items-center gap-1 text-xs font-bold" style={{ color: 'var(--admin-accent)' }}>
                            Open <ExternalLink size={12} />
                          </Link>
                        ) : (
                          <p className="mt-1 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{report.comment?.targetId || '—'}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => finish(report, 'approved', 'resolved', 'Comment kept visible.')}
                            className="grid h-8 w-8 place-items-center rounded-md disabled:opacity-50"
                            style={{ background: 'var(--admin-success-bg)', color: 'var(--admin-success)' }}
                            title="Keep visible"
                          >
                            <Check size={15} />
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => finish(report, 'hidden', 'resolved', 'Comment hidden.')}
                            className="grid h-8 w-8 place-items-center rounded-md disabled:opacity-50"
                            style={{ background: 'var(--admin-warning-bg)', color: 'var(--admin-warning)' }}
                            title="Hide"
                          >
                            <EyeOff size={15} />
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setDeleteTarget(report)}
                            className="grid h-8 w-8 place-items-center rounded-md disabled:opacity-50"
                            style={{ background: 'var(--admin-danger-bg)', color: 'var(--admin-danger)' }}
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => finish(report, null, 'dismissed', 'Report dismissed.')}
                            className="grid h-8 w-8 place-items-center rounded-md disabled:opacity-50"
                            style={{ background: 'var(--admin-input-bg)', color: 'var(--admin-text-secondary)' }}
                            title="Dismiss report"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
