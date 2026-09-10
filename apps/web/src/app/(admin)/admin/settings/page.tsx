'use client';

import { AdminPageHeader } from '../../../../components/admin/AdminShared';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Settings" subtitle="Manage site configuration and preferences." />

      <div className="rounded-xl p-5" style={{ border: '1px solid var(--admin-warning)', background: 'var(--admin-warning-bg)' }}>
        <h3 className="text-sm font-bold" style={{ color: 'var(--admin-warning)' }}>Backend API Required</h3>
        <p className="mt-1 text-sm" style={{ color: 'var(--admin-warning)' }}>
          Site settings require a backend configuration endpoint.
          Currently, all site settings are configured via environment variables on the server.
        </p>
        <div className="mt-3 rounded-lg p-3 text-xs" style={{ border: '1px solid var(--admin-warning)', background: 'var(--admin-card)', color: 'var(--admin-warning)' }}>
          <p className="font-semibold">Required backend endpoints:</p>
          <ul className="mt-1 list-disc pl-4 space-y-0.5">
            <li>GET /api/settings — Get current site settings</li>
            <li>PATCH /api/settings — Update site settings</li>
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl p-5" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--admin-text)' }}>General</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--admin-text-secondary)' }}>Site Name</label>
              <input type="text" value="PAK CRICZONE" disabled className="w-full rounded-lg px-3 py-2 text-sm" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-input-bg)', color: 'var(--admin-text)' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--admin-text-secondary)' }}>Tagline</label>
              <input type="text" value="Cricket Lives Here" disabled className="w-full rounded-lg px-3 py-2 text-sm" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-input-bg)', color: 'var(--admin-text)' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--admin-text-secondary)' }}>API URL</label>
              <input type="text" value={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'} disabled className="w-full rounded-lg px-3 py-2 text-sm font-mono" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-input-bg)', color: 'var(--admin-text-muted)' }} />
            </div>
          </div>
        </div>

        <div className="rounded-xl p-5" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--admin-text)' }}>About</h3>
          <div className="space-y-2 text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
            <p>PakCricZone CMS v1.0.0</p>
            <p>Live cricket scores, news and statistics for Pakistani cricket fans.</p>
            <div className="mt-4 rounded-lg p-3 text-xs" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-input-bg)', color: 'var(--admin-text-secondary)' }}>
              <p>Frontend: Next.js 16 + React 19 + Tailwind CSS 4</p>
              <p>Backend: NestJS 10 + Prisma + PostgreSQL</p>
              <p>Auth: JWT with Bearer tokens</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
