'use client';

import { MessageSquare, Trash2 } from 'lucide-react';
import {
  AdminPageHeader,
  EmptyState,
} from '../../../../components/admin/AdminShared';

export default function CommentsPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Comment Moderation"
        subtitle="Review and manage comments across news stories and matches."
        actions={
          <button
            type="button"
            disabled
            className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold"
            style={{
              background: 'var(--admin-input-bg)',
              color: 'var(--admin-text-muted)',
            }}
          >
            <Trash2 size={14} /> Moderation (Coming Soon)
          </button>
        }
      />

      <div
        className="rounded-lg p-4"
        style={{
          border: '1px solid var(--admin-warning)',
          background: 'var(--admin-warning-bg)',
        }}
      >
        <h2
          className="text-xs font-bold"
          style={{ color: 'var(--admin-warning)' }}
        >
          Backend API Required
        </h2>
        <p
          className="mt-1 text-xs"
          style={{ color: 'var(--admin-warning)' }}
        >
          The current API can only return comments when both a target type and
          target ID are supplied. The admin panel needs dedicated protected
          endpoints to list every comment and let administrators remove any
          inappropriate comment.
        </p>

        <div
          className="mt-3 rounded-md p-3 text-xs"
          style={{
            border: '1px solid var(--admin-warning)',
            background: 'var(--admin-card)',
            color: 'var(--admin-warning)',
          }}
        >
          <p className="font-bold">Required backend endpoints:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            <li>
              GET /api/admin/comments — List all comments with pagination,
              search and target-type filters
            </li>
            <li>
              DELETE /api/admin/comments/:id — Allow an administrator to delete
              any comment
            </li>
          </ul>
          <p className="mt-3 font-bold">Expected list query parameters:</p>
          <p className="mt-1 font-mono">
            page, limit, q, targetType, sort
          </p>
        </div>
      </div>

      <EmptyState
        icon={<MessageSquare size={28} />}
        title="Global comment moderation is not available yet"
        message="Once the protected admin comment APIs are implemented, all comments will appear here in a searchable, paginated table with delete actions."
      />
    </div>
  );
}
