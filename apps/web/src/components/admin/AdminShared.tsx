'use client';

import { type ReactNode, forwardRef, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { StatusBadge as SharedStatusBadge } from '../Badge';

/* ─── Page Header ──────────────────────────────────────────── */

export function AdminPageHeader({
  icon,
  iconColor,
  badge,
  title,
  subtitle,
  actions,
}: {
  icon?: ReactNode;
  iconColor?: string;
  badge?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {(badge || icon) && (
          <div className="flex items-center gap-2 mb-1.5">
            {icon && <span style={{ color: iconColor || 'var(--admin-accent)' }}>{icon}</span>}
            {badge && (
              <span
                className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium uppercase tracking-wide"
                style={{ background: 'var(--admin-accent)', color: '#fff' }}
              >
                {badge}
              </span>
            )}
          </div>
        )}
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--admin-text)' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
    </div>
  );
}

/* ─── Stat Card ────────────────────────────────────────────── */

export function StatCard({
  label,
  value,
  icon,
  color,
  bgColor,
  sub,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  color?: string;
  bgColor?: string;
  sub?: string;
}) {
  return (
    <div
      className="rounded-lg p-4"
      style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--admin-text-secondary)' }}
        >
          {label}
        </span>
        <div
          className="grid h-7 w-7 place-items-center rounded-md"
          style={{ background: bgColor || 'var(--admin-input-bg)', color: color || 'var(--admin-accent)' }}
        >
          {icon}
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
          {sub}
        </p>
      )}
    </div>
  );
}

/* ─── Table Skeleton ───────────────────────────────────────── */

export function AdminTableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-table-header)' }}>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <div className="h-3 w-16 rounded skeleton" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                {Array.from({ length: cols }).map((_, c) => (
                  <td key={c} className="px-4 py-3">
                    <div className="h-3 rounded skeleton" style={{ width: c === 0 ? '60%' : '40%' }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Loading State ────────────────────────────────────────── */

export function LoadingState({ text = 'Loading...' }: { text?: string }) {
  return (
    <div
      className="flex min-h-[200px] items-center justify-center rounded-lg"
      style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
    >
      <div className="flex items-center gap-3">
        <Loader2 size={18} className="animate-spin" style={{ color: 'var(--admin-accent)' }} />
        <span className="text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
          {text}
        </span>
      </div>
    </div>
  );
}

/* ─── Empty State ──────────────────────────────────────────── */

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div
      className="rounded-lg border border-dashed p-10 text-center"
      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-card)' }}
    >
      {icon && (
        <div className="mx-auto mb-3" style={{ color: 'var(--admin-text-muted)' }}>
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
        {title}
      </h3>
      {message && (
        <p className="mt-1 text-xs max-w-sm mx-auto" style={{ color: 'var(--admin-text-secondary)' }}>
          {message}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ─── Error State ──────────────────────────────────────────── */

export function ErrorState({
  message = 'Something went wrong',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="rounded-lg p-6 text-center"
      style={{ border: '1px solid var(--admin-danger)', background: 'var(--admin-danger-bg)' }}
    >
      <p className="text-sm font-semibold" style={{ color: 'var(--admin-danger)' }}>
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-md px-4 py-1.5 text-xs font-bold text-white"
          style={{ background: 'var(--admin-danger)' }}
        >
          Try again
        </button>
      )}
    </div>
  );
}

/* ─── Status Badge ─────────────────────────────────────────── */

export function StatusBadge({ status }: { status: string }) {
  return <SharedStatusBadge status={status} />;
}

/* ─── Confirm Dialog ───────────────────────────────────────── */

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
  loading = false,
  danger = false,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  danger?: boolean;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [loading, onCancel, open]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <div
        className="w-full max-w-sm rounded-lg p-5"
        style={{ background: 'var(--admin-card)', boxShadow: 'var(--admin-shadow-lg)' }}
      >
        <h3
          id="confirm-dialog-title"
          className="text-sm font-bold"
          style={{ color: 'var(--admin-text)' }}
        >
          {title}
        </h3>
        <p id="confirm-dialog-description" className="mt-2 text-xs" style={{ color: 'var(--admin-text-secondary)' }}>
          {message}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-secondary)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-md px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
            style={{ background: danger ? 'var(--admin-danger)' : 'var(--admin-accent)' }}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Form Inputs ──────────────────────────────────────────── */

const inputBase: React.CSSProperties = {
  width: '100%',
  borderRadius: '0.375rem',
  border: '1px solid var(--admin-border)',
  background: 'var(--admin-input-bg)',
  color: 'var(--admin-text)',
  fontSize: '0.8125rem',
  lineHeight: '1.5',
  outline: 'none',
  transition: 'border-color 0.15s',
};

export const AdminInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ style, ...props }, ref) => (
    <input
      ref={ref}
      style={{ ...inputBase, padding: '0.5rem 0.75rem', ...style }}
      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--admin-accent)'; props.onFocus?.(e); }}
      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--admin-border)'; props.onBlur?.(e); }}
      {...props}
    />
  )
);
AdminInput.displayName = 'AdminInput';

export const AdminSelect = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ style, children, ...props }, ref) => (
    <select
      ref={ref}
      style={{ ...inputBase, padding: '0.5rem 2rem 0.5rem 0.75rem', appearance: 'auto' as any, ...style }}
      {...props}
    >
      {children}
    </select>
  )
);
AdminSelect.displayName = 'AdminSelect';

/* ─── Card Panel ───────────────────────────────────────────── */

export function CardPanel({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg ${className}`}
      style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3"
      style={{ borderBottom: '1px solid var(--admin-border)' }}
    >
      {children}
      {action}
    </div>
  );
}
