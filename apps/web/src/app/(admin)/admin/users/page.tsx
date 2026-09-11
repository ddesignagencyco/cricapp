'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Search } from 'lucide-react';
import { AdminInput, AdminPageHeader, ErrorState, LoadingState } from '../../../../components/admin/AdminShared';
import AdminPagination from '../../../../components/admin/AdminPagination';
import { fetchAdminUsers, updateAdminUser, type AdminUser } from '../../../../services/admin';

export default function UsersPage() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = (nextPage = page, query = q) => {
    setLoading(true);
    setError(false);
    fetchAdminUsers({ page: nextPage, limit: 20, q: query || undefined })
      .then((res) => {
        setUsers(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages);
        setPage(nextPage);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(1, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patch = async (user: AdminUser, input: { isAdmin?: boolean; emailVerified?: boolean }) => {
    setBusyId(user.id);
    try {
      const updated = await updateAdminUser(user.id, input);
      setUsers((list) => list.map((item) => (item.id === user.id ? { ...item, ...updated } : item)));
      toast.success('User updated.');
    } catch {
      toast.error('Could not update this user.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Users" subtitle="Promote administrators and mark emails as verified. Invite and delete are not available on the API." />

      <div className="relative max-w-sm">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--admin-text-muted)' }} />
        <AdminInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') load(1, q);
          }}
          placeholder="Search email, username or name"
          style={{ paddingLeft: '2rem' }}
        />
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message="Could not load users." onRetry={() => load(page, q)} />
      ) : (
        <div className="overflow-hidden rounded-lg" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <table className="w-full text-left text-xs">
            <thead>
              <tr style={{ background: 'var(--admin-table-header)', borderBottom: '1px solid var(--admin-border)' }}>
                <th className="px-4 py-2.5">User</th>
                <th className="px-4 py-2.5">Email</th>
                <th className="px-4 py-2.5">Role</th>
                <th className="px-4 py-2.5">Verified</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  <td className="px-4 py-2.5" style={{ color: 'var(--admin-text)' }}>{user.displayName || user.username}</td>
                  <td className="px-4 py-2.5" style={{ color: 'var(--admin-text-secondary)' }}>{user.email}</td>
                  <td className="px-4 py-2.5">{user.isAdmin ? 'Admin' : 'Member'}</td>
                  <td className="px-4 py-2.5">{user.emailVerified ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      disabled={busyId === user.id}
                      onClick={() => patch(user, { isAdmin: !user.isAdmin })}
                      className="mr-2 text-xs font-semibold"
                      style={{ color: 'var(--admin-accent)' }}
                    >
                      {user.isAdmin ? 'Remove admin' : 'Make admin'}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === user.id}
                      onClick={() => patch(user, { emailVerified: !user.emailVerified })}
                      className="text-xs font-semibold"
                      style={{ color: 'var(--admin-text-secondary)' }}
                    >
                      {user.emailVerified ? 'Unverify' : 'Verify'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3">
            <AdminPagination page={page} totalPages={totalPages} total={total} limit={20} onPageChange={(p) => load(p, q)} />
          </div>
        </div>
      )}
    </div>
  );
}
