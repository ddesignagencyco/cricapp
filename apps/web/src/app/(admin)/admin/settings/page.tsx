'use client';

import { useEffect, useState } from 'react';
import { AdminPageHeader } from '../../../../components/admin/AdminShared';
import { fetchAdminAnalytics, fetchIngestionHealth, type AdminAnalytics, type IngestionHealth } from '../../../../services/admin';
import { fetchApiHealth, type ApiHealthJson } from '../../../../services/health';

export default function SettingsPage() {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [ingestion, setIngestion] = useState<IngestionHealth | null>(null);
  const [health, setHealth] = useState<ApiHealthJson | null>(null);

  useEffect(() => {
    fetchAdminAnalytics().then(setAnalytics).catch(() => setAnalytics(null));
    fetchIngestionHealth().then(setIngestion).catch(() => setIngestion(null));
    fetchApiHealth().then(setHealth).catch(() => setHealth(null));
  }, []);

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Settings" subtitle="Live API health. Site copy is edited under Editorial." />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-lg p-4" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <h3 className="text-xs font-bold mb-3" style={{ color: 'var(--admin-text)' }}>API health</h3>
          <p className="text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
            GET /health/json: {health?.status || 'unavailable'}
          </p>
          <p className="mt-2 text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
            Ingestion: {ingestion?.status || 'unavailable'}
            {ingestion?.liveMatchCount != null ? ` · ${ingestion.liveMatchCount} live` : ''}
          </p>
        </div>

        <div className="rounded-lg p-4" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <h3 className="text-xs font-bold mb-3" style={{ color: 'var(--admin-text)' }}>Analytics snapshot</h3>
          {analytics ? (
            <ul className="space-y-1 text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
              <li>Users {analytics.users}</li>
              <li>Published news {analytics.publishedArticles}</li>
              <li>Comments {analytics.comments}</li>
              <li>Pending reports {analytics.pendingReports}</li>
            </ul>
          ) : (
            <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>Could not load GET /admin/analytics.</p>
          )}
        </div>
      </div>
    </div>
  );
}
