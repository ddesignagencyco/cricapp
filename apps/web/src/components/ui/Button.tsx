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
  md: 'h-9 px-4 text-xs sm:text-sm gap-2 rounded-md font-bold',
  lg: 'h-11 px-5 text-sm gap-2.5 rounded-md font-bold',
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
      style,
      ...props
    },
    ref
  ) => {
    // Semantic styling using theme tokens
    const getVariantStyles = (): { className: string; inlineStyle?: React.CSSProperties } => {
      switch (variant) {
        case 'primary':
          return {
            className:
              'bg-accent text-white shadow-sm transition-all duration-150 hover:brightness-110 active:brightness-95 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
            inlineStyle: {
              background: 'var(--color-brand)',
              color: '#FFFFFF',
            },
          };
        case 'secondary':
          return {
            className:
              'transition-all duration-150 hover:brightness-105 active:brightness-95 focus-visible:ring-2 focus-visible:ring-accent',
            inlineStyle: {
              background: 'var(--color-surface-elevated)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
            },
          };
        case 'outline':
          return {
            className:
              'transition-all duration-150 hover:brightness-95 focus-visible:ring-2 focus-visible:ring-accent',
            inlineStyle: {
              background: 'transparent',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
            },
          };
        case 'ghost':
          return {
            className:
              'transition-all duration-150 hover:brightness-95 focus-visible:ring-2 focus-visible:ring-accent',
            inlineStyle: {
              background: 'transparent',
              color: 'var(--color-text-secondary)',
            },
          };
        case 'destructive':
          return {
            className:
              'text-white shadow-sm transition-all duration-150 hover:brightness-110 active:brightness-95 focus-visible:ring-2 focus-visible:ring-danger',
            inlineStyle: {
              background: 'var(--color-danger)',
              color: '#FFFFFF',
            },
          };
      }
    };

    const v = getVariantStyles();

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center select-none transition-colors disabled:pointer-events-none disabled:opacity-50 ${sizeClasses[size]} ${v.className} ${className}`}
        style={{ ...v.inlineStyle, ...style }}
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
