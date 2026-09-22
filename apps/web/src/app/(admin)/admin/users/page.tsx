'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Search, Trash2, Users } from 'lucide-react';
import {
  AdminAvatar,
  AdminInput,
  AdminPageHeader,
  AdminToggle,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../../components/admin/AdminShared';
import Badge from '../../../../components/Badge';
import AdminPagination from '../../../../components/admin/AdminPagination';
import { deleteAdminUser, fetchAdminUsers, updateAdminUser, type AdminUser } from '../../../../services/admin';
import { useAuth } from '../../../../components/AuthProvider';

const LIMIT = 20;

const ROLE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'superadmin', label: 'Superadmin' },
  { key: 'admin', label: 'Admins' },
  { key: 'user', label: 'Users' },
] as const;

type RoleFilter = (typeof ROLE_FILTERS)[number]['key'];

function roleRank(user: AdminUser) {
  if (user.isSuperAdmin) return 0;
  if (user.isAdmin) return 1;
  return 2;
}

function sortUsers(list: AdminUser[]) {
  return [...list].sort((a, b) => {
    const rank = roleRank(a) - roleRank(b);
    if (rank !== 0) return rank;
    const an = (a.displayName || a.username || '').toLowerCase();
    const bn = (b.displayName || b.username || '').toLowerCase();
    return an.localeCompare(bn);
  });
}

type PendingAction =
  | { kind: 'delete'; user: AdminUser }
  | { kind: 'admin'; user: AdminUser; next: boolean }
  | { kind: 'verified'; user: AdminUser; next: boolean };

function userLabel(user: AdminUser) {
  return user.displayName || user.username;
}

function confirmCopy(action: PendingAction): { title: string; message: string; confirmLabel: string; danger: boolean } {
  const name = userLabel(action.user);
  switch (action.kind) {
    case 'delete':
      return {
        title: `Delete ${name}?`,
        message: `This removes @${action.user.username} permanently. This cannot be undone.`,
        confirmLabel: 'Delete',
        danger: true,
      };
    case 'admin':
      return action.next
        ? {
            title: `Make ${name} an admin?`,
            message: `@${action.user.username} will get admin access to this dashboard.`,
            confirmLabel: 'Make admin',
            danger: false,
          }
        : {
            title: `Remove admin from ${name}?`,
            message: `@${action.user.username} will become a regular member.`,
            confirmLabel: 'Remove admin',
            danger: true,
          };
    case 'verified':
      return action.next
        ? {
            title: `Verify ${name}?`,
            message: `Mark ${action.user.email} as verified.`,
            confirmLabel: 'Verify',
            danger: false,
          }
        : {
            title: `Unverify ${name}?`,
            message: `${action.user.email} will be marked unverified.`,
            confirmLabel: 'Unverify',
            danger: true,
          };
    default: {
      const _never: never = action;
      throw new Error(`Unhandled user action: ${JSON.stringify(_never)}`);
    }
  }
}

function matchesRole(user: AdminUser, role: RoleFilter) {
  if (role === 'all') return true;
  if (role === 'superadmin') return Boolean(user.isSuperAdmin);
  if (role === 'admin') return Boolean(user.isAdmin) && !user.isSuperAdmin;
  return !user.isAdmin && !user.isSuperAdmin;
}

export default function UsersPage() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [pending, setPending] = useState<PendingAction | null>(null);
  const { user: me } = useAuth();

  const load = (nextPage = page, query = q) => {
    setLoading(true);
    setError(false);
    fetchAdminUsers({ page: nextPage, limit: LIMIT, q: query || undefined })
      .then((res) => {
        setUsers(sortUsers(res.items));
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
      setUsers((list) => sortUsers(list.map((item) => (item.id === user.id ? { ...item, ...updated } : item))));
      toast.success('User updated.');
    } catch {
      toast.error('Could not update this user.');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (user: AdminUser) => {
    if (user.isSuperAdmin) return;
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

  const runPending = async () => {
    if (!pending || busyId) return;
    const action = pending;
    switch (action.kind) {
      case 'delete':
        await remove(action.user);
        break;
      case 'admin':
        await patch(action.user, { isAdmin: action.next });
        break;
      case 'verified':
        await patch(action.user, { emailVerified: action.next });
        break;
      default: {
        const _never: never = action;
        throw new Error(`Unhandled user action: ${JSON.stringify(_never)}`);
      }
    }
    setPending(null);
  };

  const visible = users.filter((user) => matchesRole(user, roleFilter));
  const confirm = pending ? confirmCopy(pending) : null;

  return (
    <div className="space-y-5">
      <AdminPageHeader title="Users" subtitle="Toggle admin access and email verification. Superadmin accounts are read-only." />

      <div className="flex flex-col gap-3 rounded-lg p-3 md:flex-row md:items-center" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
        <div className="relative w-full max-w-md">
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
        <div className="flex flex-wrap gap-1.5">
          {ROLE_FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setRoleFilter(item.key)}
              className="rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{
                background: roleFilter === item.key ? 'var(--admin-accent)' : 'var(--admin-input-bg)',
                color: roleFilter === item.key ? 'var(--color-brand-fg)' : 'var(--admin-text-secondary)',
                border: roleFilter === item.key ? 'none' : '1px solid var(--admin-border)',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingState variant="people" />
      ) : error ? (
        <ErrorState message="Could not load users." onRetry={() => load(page, q)} />
      ) : visible.length === 0 ? (
        <EmptyState icon={<Users size={28} />} title="No users found" />
      ) : (
        <div className="overflow-hidden rounded-lg" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <div className="table-scroll">
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
                {visible.map((user) => {
                  const name = userLabel(user);
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
                          <Badge tone="primary">Superadmin</Badge>
                        ) : (
                          <div className="flex items-center gap-2.5">
                            <AdminToggle
                              checked={user.isAdmin}
                              disabled={busy}
                              label={user.isAdmin ? 'Remove admin' : 'Make admin'}
                              onChange={() => setPending({ kind: 'admin', user, next: !user.isAdmin })}
                            />
                            <Badge tone={user.isAdmin ? 'primary' : 'neutral'}>
                              {user.isAdmin ? 'Admin' : 'Member'}
                            </Badge>
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
                            onChange={() => setPending({ kind: 'verified', user, next: !user.emailVerified })}
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
                              onClick={() => setPending({ kind: 'delete', user })}
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

      <ConfirmDialog
        open={Boolean(pending && confirm)}
        title={confirm?.title || ''}
        message={confirm?.message || ''}
        confirmLabel={confirm?.confirmLabel || 'Confirm'}
        danger={confirm?.danger || false}
        loading={Boolean(pending && busyId === pending.user.id)}
        onCancel={() => {
          if (busyId) return;
          setPending(null);
        }}
        onConfirm={() => {
          void runPending();
        }}
      />
    </div>
  );
}
