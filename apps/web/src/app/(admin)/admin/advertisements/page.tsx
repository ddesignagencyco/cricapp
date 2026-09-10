'use client';

import { AdminPageHeader } from '../../../../components/admin/AdminShared';

const defaultPlacements = [
  { name: 'Homepage Leaderboard', size: '970 × 90', status: 'Active', fill: '92%', revenue: '$1,240' },
  { name: 'Article In-content', size: '728 × 90', status: 'Active', fill: '87%', revenue: '$1,680' },
  { name: 'Sidebar Rectangle', size: '300 × 250', status: 'Pending', fill: '63%', revenue: '$922' },
  { name: 'Mobile Banner', size: '320 × 100', status: 'Disabled', fill: '0%', revenue: '$0' },
];

export default function AdvertisementsPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Ads & Revenue" subtitle="Manage ad placements and inventory." />

      <div className="rounded-lg p-4" style={{ border: '1px solid var(--admin-warning)', background: 'var(--admin-warning-bg)' }}>
        <h3 className="text-xs font-bold" style={{ color: 'var(--admin-warning)' }}>Backend API Required</h3>
        <p className="mt-1 text-xs" style={{ color: 'var(--admin-warning)' }}>
          The advertisement management system requires backend CRUD endpoints for ad placements.
          Below is a preview of the default placement inventory.
        </p>
        <div className="mt-3 rounded-lg p-3 text-xs" style={{ border: '1px solid var(--admin-warning)', background: 'var(--admin-card)', color: 'var(--admin-warning)' }}>
          <p className="font-bold">Required backend endpoints:</p>
          <ul className="mt-1 list-disc pl-4 space-y-0.5">
            <li>GET /api/ads — List all ad placements</li>
            <li>POST /api/ads — Create ad placement</li>
            <li>PATCH /api/ads/:id — Update ad placement</li>
            <li>DELETE /api/ads/:id — Delete ad placement</li>
          </ul>
        </div>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
        <table className="w-full text-left text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-table-header)' }}>
              <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Placement</th>
              <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Size</th>
              <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Status</th>
              <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Fill Rate</th>
              <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Revenue (30d)</th>
            </tr>
          </thead>
          <tbody>
            {defaultPlacements.map((p) => (
              <tr key={p.name} style={{ borderBottom: '1px solid var(--admin-border)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--admin-table-row-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <td className="px-4 py-2.5 text-xs font-bold" style={{ color: 'var(--admin-text)' }}>{p.name}</td>
                <td className="px-4 py-2.5 text-xs font-mono" style={{ color: 'var(--admin-text-secondary)' }}>{p.size}</td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold uppercase"
                    style={{
                      background: p.status === 'Active' ? 'var(--admin-success-bg)' : p.status === 'Pending' ? 'var(--admin-warning-bg)' : 'var(--admin-input-bg)',
                      color: p.status === 'Active' ? 'var(--admin-success)' : p.status === 'Pending' ? 'var(--admin-warning)' : 'var(--admin-text-secondary)',
                    }}>{p.status}</span>
                </td>
                <td className="px-4 py-2.5 text-xs font-bold" style={{ color: 'var(--admin-text)' }}>{p.fill}</td>
                <td className="px-4 py-2.5 text-xs font-bold" style={{ color: 'var(--admin-text)' }}>{p.revenue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
