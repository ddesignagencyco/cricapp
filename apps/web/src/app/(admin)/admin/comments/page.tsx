'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AdminPageHeader, ErrorState, LoadingState, EmptyState } from '../../../../components/admin/AdminShared';
import {
  fetchReportedComments,
  moderateComment,
  resolveReport,
  type ReportedComment,
} from '../../../../services/admin';

export default function CommentsPage() {
  const [reports, setReports] = useState<ReportedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const act = async (report: ReportedComment, status: 'approved' | 'hidden' | 'deleted', reportStatus: 'resolved' | 'dismissed') => {
    if (!report.comment) return;
    setBusyId(report.id);
    try {
      await moderateComment(report.comment.id, status);
      await resolveReport(report.id, reportStatus);
      setReports((list) => list.filter((item) => item.id !== report.id));
      toast.success('Moderation saved.');
    } catch {
      toast.error('Could not update this report.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Comment moderation"
        subtitle="Pending reports from POST /comments/:id/report. There is no global comment list endpoint."
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message="Could not load reported comments." onRetry={load} />
      ) : reports.length === 0 ? (
        <EmptyState title="No pending reports" message="Reported comments will appear here for review." />
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className="rounded-lg p-4"
              style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
            >
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-warning)' }}>
                {report.reason}
              </p>
              <p className="mt-2 text-sm" style={{ color: 'var(--admin-text)' }}>
                {report.comment?.body || 'Comment missing'}
              </p>
              <p className="mt-1 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                {report.comment?.user?.username || 'Unknown'} · {report.comment?.targetType}/{report.comment?.targetId}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" disabled={busyId === report.id} onClick={() => act(report, 'approved', 'resolved')} className="rounded-md px-3 py-1.5 text-xs font-bold text-white" style={{ background: 'var(--admin-success)' }}>
                  Approve
                </button>
                <button type="button" disabled={busyId === report.id} onClick={() => act(report, 'hidden', 'resolved')} className="rounded-md px-3 py-1.5 text-xs font-bold" style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}>
                  Hide
                </button>
                <button type="button" disabled={busyId === report.id} onClick={() => act(report, 'deleted', 'resolved')} className="rounded-md px-3 py-1.5 text-xs font-bold text-white" style={{ background: 'var(--admin-danger)' }}>
                  Delete
                </button>
                <button type="button" disabled={busyId === report.id} onClick={() => act(report, 'approved', 'dismissed')} className="rounded-md px-3 py-1.5 text-xs font-semibold" style={{ color: 'var(--admin-text-secondary)' }}>
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
