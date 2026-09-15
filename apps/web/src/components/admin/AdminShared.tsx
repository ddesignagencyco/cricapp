'use client';

import { type ReactNode, forwardRef, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Check, ChevronDown } from 'lucide-react';
import { StatusBadge as SharedStatusBadge } from '../Badge';
import { getInitials } from '../../utils/helpers';
import RemoteImage from '../RemoteImage';
import { AdminTableSkeleton } from '../skeletons/Skeletons';

export function AdminEntityLink({
  href,
  children,
  className = '',
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={`font-semibold transition-colors hover:underline ${className}`}
      style={{ color: 'var(--admin-accent)' }}
    >
      {children}
    </Link>
  );
}

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
                className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium tracking-wide"
                style={{ background: 'var(--admin-accent)', color: 'var(--color-brand-fg)' }}
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

export { AdminTableSkeleton };

export function LoadingState({ text: _text = 'Loading...' }: { text?: string }) {
  return <AdminTableSkeleton />;
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

/* ─── Chip ─────────────────────────────────────────────────── */

const CHIP_TONES: Record<string, { bg: string; fg: string }> = {
  neutral: { bg: 'var(--admin-input-bg)', fg: 'var(--admin-text-secondary)' },
  accent: { bg: 'var(--admin-info-bg)', fg: 'var(--admin-accent)' },
  info: { bg: 'var(--admin-info-bg)', fg: 'var(--admin-info)' },
  success: { bg: 'var(--admin-success-bg)', fg: 'var(--admin-success)' },
  warning: { bg: 'var(--admin-warning-bg)', fg: 'var(--admin-warning)' },
  danger: { bg: 'var(--admin-danger-bg)', fg: 'var(--admin-danger)' },
};

export function AdminChip({
  label,
  tone = 'neutral',
  icon,
}: {
  label: string;
  tone?: keyof typeof CHIP_TONES;
  icon?: ReactNode;
}) {
  const colors = CHIP_TONES[tone] || CHIP_TONES.neutral;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap capitalize"
      style={{ background: colors.bg, color: colors.fg }}
    >
      {icon}
      {label}
    </span>
  );
}

/* ─── Table Toolbar ────────────────────────────────────────── */

export function AdminResultCount({ shown, total, noun }: { shown: number; total: number; noun: string }) {
  return (
    <p className="text-xs tabular-nums" style={{ color: 'var(--admin-text-muted)' }}>
      Showing <span style={{ color: 'var(--admin-text)' }}>{shown}</span> of {total.toLocaleString()} {noun}
    </p>
  );
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
            className={`rounded-md px-3 py-1.5 text-xs font-bold disabled:opacity-50 ${danger ? '' : 'btn-brand'}`}
            style={danger ? { background: 'var(--admin-danger)', color: 'var(--color-brand-fg)' } : undefined}
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
  boxShadow: 'none',
  transition: 'border-color 0.15s',
};

export const AdminInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ style, onFocus, onBlur, ...props }, ref) => (
    <input
      ref={ref}
      className="outline-none ring-0 focus:outline-none focus:ring-0"
      style={{ ...inputBase, padding: '0.5rem 0.75rem', ...style }}
      onFocus={onFocus}
      onBlur={onBlur}
      {...props}
    />
  )
);
AdminInput.displayName = 'AdminInput';

export const AdminSelect = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ style, children, className, ...props }, ref) => (
    <span className={`relative inline-flex w-full ${className || ''}`} style={style}>
      <select
        ref={ref}
        className="w-full appearance-none outline-none ring-0 focus:outline-none focus:ring-0"
        style={{ ...inputBase, padding: '0.5rem 2rem 0.5rem 0.75rem' }}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        aria-hidden
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
        style={{ color: 'var(--admin-text-muted)' }}
      />
    </span>
  )
);
AdminSelect.displayName = 'AdminSelect';

export function RequiredStar() {
  return (
    <span aria-hidden className="ml-0.5 font-bold" style={{ color: 'var(--admin-danger, var(--color-danger))' }}>
      *
    </span>
  );
}

export function AdminField({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="block min-w-0">
      <span className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--admin-text-secondary)' }}>
        {label}
        {required ? <RequiredStar /> : null}
      </span>
      {children}
      {hint ? (
        <span className="mt-1.5 block text-[11px] leading-snug" style={{ color: 'var(--admin-text-muted)' }}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export function AdminIconButton({
  label,
  onClick,
  tone = 'neutral',
  disabled,
  children,
  active,
}: {
  label: string;
  onClick?: () => void;
  tone?: 'neutral' | 'accent' | 'danger';
  disabled?: boolean;
  children: ReactNode;
  active?: boolean;
}) {
  const tones = {
    neutral: { background: 'var(--admin-input-bg)', color: 'var(--admin-text-secondary)' },
    accent: { background: 'var(--admin-info-bg)', color: 'var(--admin-accent)' },
    danger: { background: 'var(--admin-danger-bg)', color: 'var(--admin-danger)' },
  } as const;

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-md disabled:opacity-50"
      style={{
        ...tones[tone],
        boxShadow: active ? 'inset 0 0 0 1px var(--admin-accent)' : undefined,
      }}
    >
      {children}
    </button>
  );
}

export function AdminMenu({
  value,
  options,
  onChange,
  label,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = () => setOpen(false);

  const toggle = () => {
    const btn = btnRef.current;
    if (!btn) return;
    if (!open) {
      const rect = btn.getBoundingClientRect();
      const height = options.length * 36 + 10;
      const top = rect.bottom + 6 + height > window.innerHeight
        ? Math.max(8, rect.top - 6 - height)
        : rect.bottom + 6;
      setPos({ top, left: Math.min(rect.right - 168, window.innerWidth - 176) });
    }
    setOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (btnRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('mousedown', onPointer);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('mousedown', onPointer);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const selected = options.find((option) => option.value === value)?.label || label;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        title={`${label}: ${selected}`}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggle}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-md"
        style={{ background: 'var(--admin-info-bg)', color: 'var(--admin-accent)' }}
      >
        <ChevronDown size={16} />
      </button>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={menuRef}
              role="listbox"
              aria-label={label}
              className="fixed z-[80] overflow-hidden rounded-lg py-1 shadow-lg"
              style={{
                top: pos.top,
                left: Math.max(8, pos.left),
                width: 168,
                background: 'var(--admin-card)',
                border: '1px solid var(--admin-border)',
              }}
            >
              {options.map((option) => {
                const isActive = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => {
                      onChange(option.value);
                      close();
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold"
                    style={{
                      color: isActive ? 'var(--admin-accent)' : 'var(--admin-text)',
                      background: isActive ? 'var(--admin-info-bg)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = 'var(--admin-table-row-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isActive ? 'var(--admin-info-bg)' : 'transparent';
                    }}
                  >
                    {option.label}
                    {isActive ? <Check size={14} /> : null}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

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

export function AdminAvatar({
  name,
  src,
  size = 28,
}: {
  name: string;
  src?: string | null;
  size?: number;
}) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);
  const style = {
    width: size,
    height: size,
    backgroundImage: `linear-gradient(135deg, hsl(${hue}, 75%, 50%), hsl(${(hue + 40) % 360}, 85%, 35%))`,
  };

  if (src) {
    return (
      <RemoteImage
        src={src}
        alt={name}
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size, border: '1px solid var(--admin-border)' }}
      />
    );
  }

  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-bold text-white"
      style={{ ...style, fontSize: Math.max(9, Math.round(size * 0.36)) }}
    >
      {getInitials(name || '?')}
    </span>
  );
}

export function AdminToggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      style={{ background: checked ? 'var(--admin-success)' : 'var(--admin-border-strong)' }}
    >
      <span
        className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform"
        style={{ transform: checked ? 'translateX(16px)' : 'translateX(0)' }}
      />
    </button>
  );
}
