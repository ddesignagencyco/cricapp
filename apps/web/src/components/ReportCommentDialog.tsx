'use client';

import { useEffect, useState } from 'react';
import { Flag, Loader2, X } from 'lucide-react';

export const REPORT_REASONS = [
  { id: 'spam', label: 'Spam', hint: 'Promotional or repeated junk.' },
  { id: 'harassment', label: 'Harassment', hint: 'Personal attacks or bullying.' },
  { id: 'hate', label: 'Hate speech', hint: 'Hateful or discriminatory language.' },
  { id: 'misinformation', label: 'Misinformation', hint: 'False or misleading claims.' },
  { id: 'other', label: 'Other', hint: 'Something else moderators should review.' },
] as const;

export type ReportReasonId = (typeof REPORT_REASONS)[number]['id'];

export function buildReportReason(reasonId: ReportReasonId, details: string): string {
  const extra = details.trim();
  if (reasonId === 'other') return extra;
  return extra ? `${reasonId}: ${extra}` : reasonId;
}

interface ReportCommentDialogProps {
  open: boolean;
  commentBody?: string;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (_reason: string) => void;
}

export default function ReportCommentDialog({
  open,
  commentBody,
  loading = false,
  onCancel,
  onSubmit,
}: ReportCommentDialogProps) {
  const [reasonId, setReasonId] = useState<ReportReasonId>('spam');
  const [details, setDetails] = useState('');

  useEffect(() => {
    if (!open) return;
    setReasonId('spam');
    setDetails('');
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [loading, onCancel, open]);

  if (!open) return null;

  const canSubmit = reasonId !== 'other' || details.trim().length >= 3;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target && !loading) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-comment-title"
        className="w-full max-w-md overflow-hidden rounded-md border border-lborder bg-card shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-lborder px-4 py-3">
          <div>
            <h3 id="report-comment-title" className="flex items-center gap-2 text-sm font-bold text-mtext">
              <Flag size={14} className="text-danger" />
              Report comment
            </h3>
            <p className="mt-1 text-xs text-stext">Choose a reason. Moderators will review this comment.</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded p-1 text-stext hover:bg-elevated hover:text-mtext disabled:opacity-50"
            aria-label="Close report dialog"
          >
            <X size={16} />
          </button>
        </div>

        {commentBody && (
          <p className="mx-4 mt-3 line-clamp-3 rounded bg-elevated px-3 py-2 text-xs text-stext">“{commentBody}”</p>
        )}

        <form
          className="space-y-3 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit) return;
            onSubmit(buildReportReason(reasonId, details));
          }}
        >
          <fieldset className="space-y-2">
            <legend className="text-xs font-bold uppercase tracking-wider text-stext">Reason</legend>
            {REPORT_REASONS.map((option) => (
              <label
                key={option.id}
                className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 ${
                  reasonId === option.id ? 'border-accent bg-accent/5' : 'border-lborder bg-elevated/40'
                }`}
              >
                <input
                  type="radio"
                  name="report-reason"
                  value={option.id}
                  checked={reasonId === option.id}
                  onChange={() => setReasonId(option.id)}
                  className="mt-0.5 accent-accent"
                />
                <span>
                  <span className="block text-sm font-semibold text-mtext">{option.label}</span>
                  <span className="block text-xs text-stext">{option.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <div>
            <label htmlFor="report-details" className="block text-xs font-bold uppercase tracking-wider text-stext">
              {reasonId === 'other' ? 'Describe the issue' : 'More detail (optional)'}
            </label>
            <textarea
              id="report-details"
              rows={3}
              value={details}
              onChange={(event) => setDetails(event.target.value.slice(0, 200))}
              placeholder={reasonId === 'other' ? 'Tell moderators what is wrong…' : 'Add context if it helps'}
              className="mt-1.5 w-full resize-none rounded-md border border-lborder bg-elevated px-3 py-2 text-sm text-mtext outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            <p className="mt-1 text-right text-[11px] text-stext">{details.length}/200</p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="rounded-md border border-lborder px-3 py-2 text-xs font-semibold text-stext hover:text-mtext disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="btn-brand inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-bold disabled:opacity-50"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Flag size={13} />}
              Submit report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
