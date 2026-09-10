'use client';

import { UserCircle } from 'lucide-react';
import { useAuth } from '../../../../components/AuthProvider';
import { AdminPageHeader, EmptyState } from '../../../../components/admin/AdminShared';

export default function UsersPage() {
  const { user } = useAuth();

  const userInitials = (user?.displayName || user?.username || 'A').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  let hue = 0;
  if (user) {
    const raw = (user.displayName || user.username || '').trim();
    for (let i = 0; i < raw.length; i++) hue = raw.charCodeAt(i) + ((hue << 5) - hue);
    hue = Math.abs(hue % 360);
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Users & Roles" subtitle="Manage user accounts and permissions." />

      <div className="rounded-lg p-4" style={{ border: '1px solid var(--admin-warning)', background: 'var(--admin-warning-bg)' }}>
        <h3 className="text-xs font-bold" style={{ color: 'var(--admin-warning)' }}>Backend API Required</h3>
        <p className="mt-1 text-xs" style={{ color: 'var(--admin-warning)' }}>
          User management requires admin-level user CRUD endpoints on the backend.
          Currently, only the authenticated user profile (GET /api/auth/me) is available.
        </p>
        <div className="mt-3 rounded-lg p-3 text-xs" style={{ border: '1px solid var(--admin-warning)', background: 'var(--admin-card)', color: 'var(--admin-warning)' }}>
          <p className="font-bold">Required backend endpoints:</p>
          <ul className="mt-1 list-disc pl-4 space-y-0.5">
            <li>GET /api/users — List all users (admin only)</li>
            <li>POST /api/users/invite — Invite new user</li>
            <li>PATCH /api/users/:id — Update user role/status</li>
            <li>DELETE /api/users/:id — Deactivate user</li>
          </ul>
        </div>
      </div>

      {user && (
        <div className="rounded-lg p-4" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <h3 className="text-xs font-bold mb-3" style={{ color: 'var(--admin-text)' }}>Current Session</h3>
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-sm font-black text-white"
              style={{ backgroundImage: `linear-gradient(135deg, hsl(${hue}, 75%, 50%), hsl(${(hue + 40) % 360}, 85%, 35%))` }}>
              {userInitials}
            </span>
            <div>
              <p className="text-xs font-bold" style={{ color: 'var(--admin-text)' }}>{user.displayName || user.username}</p>
              <p className="text-xs" style={{ color: 'var(--admin-text-secondary)' }}>{user.email}</p>
              <span className="mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold"
                style={{ background: 'var(--admin-accent)', color: '#fff' }}>
                {user.isAdmin ? 'Administrator' : 'Editor'}
              </span>
            </div>
          </div>
        </div>
      )}

      <EmptyState icon={<UserCircle size={28} />} title="User management unavailable" message="Once the backend user management API is implemented, you'll be able to invite and manage users here." />
    </div>
  );
}
