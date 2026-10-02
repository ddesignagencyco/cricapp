'use client';

import Badge from '../Badge';
import { CardHeader, CardPanel, EmptyState, ErrorState, LoadingState } from './AdminShared';
import {
  adSenseErrorMessage,
  isGamblingPolicyIssue,
  policyActionLabel,
  policyActionTone,
  type AdSensePolicyIssuesResponse,
} from '../../services/adsense';
import { useAdSensePolicyIssuesQuery } from '../../queries/useAdSenseQueries';

export default function AdSensePolicyPanel({ enabled }: { enabled: boolean }) {
  const query = useAdSensePolicyIssuesQuery(enabled);
  const data: AdSensePolicyIssuesResponse | undefined = query.data;

  return (
    <CardPanel>
      <CardHeader>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
            Policy issues
          </h2>
          <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
            Most severe first.
          </p>
        </div>
        {data ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={data.summary.disabled ? 'danger' : 'neutral'}>
              {data.summary.disabled} disabled
            </Badge>
            <Badge tone={data.summary.restricted ? 'danger' : 'neutral'}>
              {data.summary.restricted} restricted
            </Badge>
            <Badge tone={data.summary.warned ? 'warning' : 'neutral'}>{data.summary.warned} warned</Badge>
          </div>
        ) : null}
      </CardHeader>

      <div className="p-4">
        {query.isError ? (
          <ErrorState
            message={adSenseErrorMessage(query.error, 'Could not load policy issues.')}
            onRetry={() => query.refetch()}
          />
        ) : query.isPending ? (
          <LoadingState />
        ) : !data || data.policyIssues.length === 0 ? (
          // An empty list is the normal case, not an error: Google only returns issues
          // once an applicable AFC ad client is ready or getting ready.
          <EmptyState
            title="No policy issues"
            message="Nothing is flagged against this account right now. Google only reports issues once an applicable ad client is ready."
          />
        ) : (
          <ul className="space-y-2">
            {data.policyIssues.map((issue) => (
              <li
                key={issue.resourceName}
                className="rounded-md p-3"
                style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-input-bg)' }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={policyActionTone(issue.action)}>{policyActionLabel(issue.action)}</Badge>
                  {isGamblingPolicyIssue(issue) ? (
                    // A gambling-policy hit is expected once `ads.gamblingAds` is on, so it
                    // gets its own badge rather than the generic treatment.
                    <Badge tone="warning">gambling</Badge>
                  ) : null}
                  <span className="text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>
                    {issue.site}
                    {issue.siteSection ? ` · ${issue.siteSection}` : ''}
                  </span>
                  <span className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
                    {issue.entityType}
                  </span>
                </div>

                <dl
                  className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] sm:grid-cols-4"
                  style={{ color: 'var(--admin-text-secondary)' }}
                >
                  <div>
                    <dt className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
                      Ad requests (7d)
                    </dt>
                    <dd className="font-mono">{issue.adRequestCount.toLocaleString('en-US')}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
                      First detected
                    </dt>
                    <dd className="font-mono">{issue.firstDetectedDate ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
                      Last detected
                    </dt>
                    <dd className="font-mono">{issue.lastDetectedDate ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
                      Escalates
                    </dt>
                    <dd className="font-mono">{issue.warningEscalationDate ?? '—'}</dd>
                  </div>
                </dl>

                {issue.warningEscalationDate && issue.action === 'WARNED' ? (
                  <p
                    className="mt-2 text-[11px] font-semibold"
                    style={{ color: 'var(--admin-warning, var(--color-warning))' }}
                  >
                    Enforcement begins {issue.warningEscalationDate} unless this is resolved.
                  </p>
                ) : null}

                {issue.uri ? (
                  <a
                    href={issue.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block break-all text-[11px] underline"
                    style={{ color: 'var(--admin-accent)' }}
                  >
                    {issue.uri}
                  </a>
                ) : null}

                {issue.topics.length ? (
                  <p className="mt-1 text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
                    Topics: {issue.topics.join(', ')}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </CardPanel>
  );
}