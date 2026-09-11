'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Search, Trash2, Users } from 'lucide-react';
import {
  AdminAvatar,
  AdminInput,
  AdminPageHeader,
  AdminToggle,
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../../components/admin/AdminShared';
import AdminPagination from '../../../../components/admin/AdminPagination';
import { deleteAdminUser, fetchAdminUsers, updateAdminUser, type AdminUser } from '../../../../services/admin';
import { useAuth } from '../../../../components/AuthProvider';

const LIMIT = 20;

export default function UsersPage() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { user: me } = useAuth();

  const load = (nextPage = page, query = q) => {
    setLoading(true);
    setError(false);
    fetchAdminUsers({ page: nextPage, limit: LIMIT, q: query || undefined })
      .then((res) => {
        setUsers(res.items);
        setTotal(res.total);
        setTotalPages(Math.max(1, res.totalPages));
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
    if (user.isSuperAdmin) return;
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

  const remove = async (user: AdminUser) => {
    if (user.isSuperAdmin) return;
    if (!window.confirm(`Delete ${user.username}? This cannot be undone.`)) return;
    setBusyId(user.id);
    try {
      await deleteAdminUser(user.id);
      setUsers((list) => list.filter((item) => item.id !== user.id));
      setTotal((n) => Math.max(0, n - 1));
      toast.success('User deleted.');
    } catch {
      toast.error('Could not delete this user.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader title="Users" subtitle="Toggle admin access and email verification. Superadmin accounts are read-only." />

      <div className="flex items-center gap-3 rounded-lg p-3" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--admin-text-muted)' }} />
          <AdminInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') load(1, q);
            }}
            placeholder="Search email, username or name"
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message="Could not load users." onRetry={() => load(page, q)} />
      ) : users.length === 0 ? (
        <EmptyState icon={<Users size={28} />} title="No users found" />
      ) : (
        <div className="overflow-hidden rounded-lg" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ background: 'var(--admin-table-header)', borderBottom: '1px solid var(--admin-border)' }}>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>User</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Email</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Admin</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Verified</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const name = user.displayName || user.username;
                  const busy = busyId === user.id;
                  const locked = Boolean(user.isSuperAdmin);
                  return (
                    <tr
                      key={user.id}
                      style={{ borderBottom: '1px solid var(--admin-border)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--admin-table-row-hover)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <AdminAvatar name={name} src={user.avatarUrl} size={32} />
                          <div className="min-w-0">
                            <p className="truncate font-semibold" style={{ color: 'var(--admin-text)' }}>{name}</p>
                            <p className="truncate text-xs" style={{ color: 'var(--admin-text-muted)' }}>@{user.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--admin-text-secondary)' }}>{user.email}</td>
                      <td className="px-4 py-3">
                        {locked ? (
                          <span
                            className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                            style={{ background: 'var(--admin-accent)', color: '#fff' }}
                          >
                            Superadmin
                          </span>
                        ) : (
                          <div className="flex items-center gap-2.5">
                            <AdminToggle
                              checked={user.isAdmin}
                              disabled={busy}
                              label={user.isAdmin ? 'Remove admin' : 'Make admin'}
                              onChange={() => patch(user, { isAdmin: !user.isAdmin })}
                            />
                            <span
                              className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                              style={{
                                background: user.isAdmin ? 'var(--admin-accent)' : 'var(--admin-input-bg)',
                                color: user.isAdmin ? '#fff' : 'var(--admin-text-secondary)',
                              }}
                            >
                              {user.isAdmin ? 'Admin' : 'Member'}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {locked ? (
                          <span
                            className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                            style={{
                              background: user.emailVerified ? 'var(--admin-success-bg)' : 'var(--admin-input-bg)',
                              color: user.emailVerified ? 'var(--admin-success)' : 'var(--admin-text-secondary)',
                            }}
                          >
                            {user.emailVerified ? 'Verified' : 'Unverified'}
                          </span>
                        ) : (
                          <AdminToggle
                            checked={user.emailVerified}
                            disabled={busy}
                            label={user.emailVerified ? 'Unverify email' : 'Verify email'}
                            onChange={() => patch(user, { emailVerified: !user.emailVerified })}
                          />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {locked ? (
                          <p className="text-right text-xs" style={{ color: 'var(--admin-text-muted)' }}>—</p>
                        ) : (
                          <div className="flex justify-end">
                            <button
                              type="button"
                              disabled={busy || user.id === me?.id}
                              onClick={() => remove(user)}
                              className="grid h-8 w-8 place-items-center rounded-md disabled:opacity-40"
                              style={{ background: 'var(--admin-danger-bg)', color: 'var(--admin-danger)' }}
                              title="Delete user"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end px-4 py-3" style={{ borderTop: '1px solid var(--admin-border)' }}>
            <AdminPagination page={page} totalPages={totalPages} total={total} limit={LIMIT} onPageChange={(p) => load(p, q)} />
          </div>
        </div>
      )}
    </div>
  );
}
