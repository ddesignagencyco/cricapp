'use client';

import React, { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-md font-semibold',
  md: 'h-9 px-4 text-sm gap-2 rounded-md font-semibold',
  lg: 'h-11 px-5 text-sm gap-2.5 rounded-md font-semibold',
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'btn-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]',
  secondary:
    'btn-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]',
  outline:
    'btn-secondary bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]',
  ghost: 'btn-ghost focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]',
  destructive:
    'btn-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-danger)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      icon,
      iconRight,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center select-none motion-reduce:transition-none disabled:pointer-events-none disabled:opacity-50 ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {loading ? <Loader2 size={size === 'sm' ? 12 : 14} className="animate-spin" /> : icon}
        {children}
        {!loading && iconRight}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
