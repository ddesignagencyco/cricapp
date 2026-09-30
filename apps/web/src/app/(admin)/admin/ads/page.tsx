'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BadgeDollarSign, ShieldAlert } from 'lucide-react';
import AdConfigPanel from '../../../../components/admin/AdConfigPanel';
import AdSenseEarningsPanel from '../../../../components/admin/AdSenseEarningsPanel';
import AdSensePolicyPanel from '../../../../components/admin/AdSensePolicyPanel';
import {
  AdminPageHeader,
  CardPanel,
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
} from '../../../../components/admin/AdminShared';
import {
  useAdSenseAdUnitsQuery,
  useAdSenseStatusQuery,
} from '../../../../queries/useAdSenseQueries';
import { siteSettingsKeys } from '../../../../queries/keys';
import { adSenseErrorMessage } from '../../../../services/adsense';
import { useSiteSettingsQuery } from '../../../../queries/useDirectoryQueries';
import type { AdConfig } from '../../../../lib/advertisements/registry';

export default function AdminAdsPage() {
  const queryClient = useQueryClient();
  const settingsQuery = useSiteSettingsQuery();
  const statusQuery = useAdSenseStatusQuery();
  const [includeArchived, setIncludeArchived] = useState(false);

  const status = statusQuery.data;
  const configured = status?.configured === true;

  // Only fetch the unit list once we know the Management API is set up, so the panel
  // does not fire a request that is guaranteed to 503.
  const adUnitsQuery = useAdSenseAdUnitsQuery(includeArchived, configured);

  const onSaved = (next: AdConfig) => {
    queryClient.setQueryData(siteSettingsKeys.current(), (previous: Record<string, unknown> | undefined) =>
      previous ? { ...previous, ads: next } : previous,
    );
    // The AdSense panels read the publisher id server-side to pick an ad client, so
    // invalidate them after a change rather than leaving a stale selection on screen.
    void queryClient.invalidateQueries({ queryKey: ['admin-adsense'] });
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Ads Manager"
        subtitle="Control which ad slots render on the public site, and monitor the AdSense account."
      />

      {settingsQuery.isError ? (
        <ErrorState message="Could not load site settings." onRetry={() => settingsQuery.refetch()} />
      ) : settingsQuery.isPending || !settingsQuery.data ? (
        <LoadingState variant="form" />
      ) : (
        <>
          <AdSenseStatusCard
            verified={adUnitsQuery.isSuccess ? true : adUnitsQuery.isError ? false : undefined}
          />

          <AdConfigPanel
            config={settingsQuery.data.ads}
            adUnits={adUnitsQuery.data?.adUnits ?? []}
            onSaved={onSaved}
          />

          {configured ? (
            <>
              <AdUnitsNotice
                skipped={adUnitsQuery.data?.skipped ?? 0}
                loading={adUnitsQuery.isPending}
                error={adUnitsQuery.error}
                includeArchived={includeArchived}
                onToggleArchived={() => setIncludeArchived((prev) => !prev)}
              />

              <AdSensePolicyPanel enabled={configured} />
              <AdSenseEarningsPanel enabled={configured} />
            </>
          ) : (
            <CardPanel>
              <div className="p-4">
                <EmptyState
                  icon={<ShieldAlert size={28} />}
                  title="AdSense reporting is not configured"
                  message="Set ADSENSE_SERVICE_ACCOUNT_JSON or ADSENSE_SERVICE_ACCOUNT_FILE on the API service, and grant the service account access to the AdSense account under Account → Users and permissions. The configuration above works without it — only the reporting panels need it."
                />
              </div>
            </CardPanel>
          )}
        </>
      )}
    </div>
  );
}

/**
 * `verified` comes from whether a real AdSense call succeeded. `status.configured`
 * alone only proves credentials are present on disk — the backend deliberately makes
 * no upstream call for it — so a green "Active" badge must never be shown on the
 * strength of `configured` alone.
 *
 *   undefined → configured, probe still running, nothing claimed
 *   true      → a data call came back, so the credentials genuinely work
 *   false     → a data call was rejected by Google
 */
function AdSenseStatusCard({ verified }: { verified?: boolean }) {
  const { data: status, isPending, isError } = useAdSenseStatusQuery();

  if (isPending) return <LoadingState />;
  if (isError || !status) {
    return <ErrorState message="Could not read the AdSense status." />;
  }

  const badge = !status.configured
    ? { status: 'inactive', hint: 'no credentials on the API service' }
    : verified === true
      ? { status: 'active', hint: 'connected — AdSense is returning data' }
      : verified === false
        ? { status: 'failed', hint: 'credentials present but Google rejected them' }
        : { status: 'checking', hint: 'checking the credentials…' };

  return (
    <CardPanel>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4 text-xs">
        <span className="flex items-center gap-2">
          <BadgeDollarSign size={15} aria-hidden style={{ color: 'var(--admin-text-muted)' }} />
          <span className="font-semibold" style={{ color: 'var(--admin-text)' }}>
            Management API
          </span>
          <StatusBadge status={badge.status} />
          <span style={{ color: 'var(--admin-text-muted)' }}>{badge.hint}</span>
        </span>
        <span style={{ color: 'var(--admin-text-secondary)' }}>
          Auth: <span className="font-mono">{status.authMode}</span>
        </span>
        <span style={{ color: 'var(--admin-text-secondary)' }}>
          Publisher: <span className="font-mono">{status.publisherId ?? '—'}</span>
        </span>
        <span style={{ color: 'var(--admin-text-secondary)' }}>
          Ad client: <span className="font-mono">{status.adClientId ?? '—'}</span>
        </span>
        {!status.configured ? (
          <span className="font-medium" style={{ color: 'var(--admin-danger)' }}>
            Set ADSENSE_SERVICE_ACCOUNT_JSON or ADSENSE_SERVICE_ACCOUNT_FILE on the API service.
          </span>
        ) : null}
      </div>
    </CardPanel>
  );
}

function AdUnitsNotice({
  skipped,
  loading,
  error,
  includeArchived,
  onToggleArchived,
}: {
  skipped: number;
  loading: boolean;
  error: unknown;
  includeArchived: boolean;
  onToggleArchived: () => void;
}) {
  return (
    <CardPanel>
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 text-xs">
        <span style={{ color: error ? 'var(--admin-danger)' : 'var(--admin-text-secondary)' }}>
          {loading
            ? 'Loading ad units…'
            : error
              ? // The backend distinguishes "no credentials" from "Google rejected
                // them", and the fix is different for each, so pass its wording through.
                adSenseErrorMessage(
                  error,
                  'The ad unit list could not be loaded, so the dropdown is empty — type slot ids by hand.',
                )
              : skipped === 0
                ? 'Ad unit list loaded. Archived units can still serve ads.'
                : `${skipped} ad unit(s) were dropped because they had no usable numeric id.`}
        </span>
        <button
          type="button"
          onClick={onToggleArchived}
          aria-pressed={includeArchived}
          className="rounded-md px-3 py-1.5 text-xs font-bold"
          style={{
            border: `1px solid ${includeArchived ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
            color: includeArchived ? 'var(--admin-accent)' : 'var(--admin-text-secondary)',
          }}
        >
          {includeArchived ? 'Hide archived units' : 'Show archived units'}
        </button>
      </div>
    </CardPanel>
  );
}