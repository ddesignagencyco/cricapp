'use client';

import React, { forwardRef, type ButtonHTMLAttributes } from 'react';

export type IconButtonVariant = 'plain' | 'bordered';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
  /** Accessible label (required when no visible text). */
  'aria-label': string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = 'plain', className = '', type = 'button', ...props }, ref) => {
    const base = variant === 'bordered' ? 'icon-btn icon-btn-bordered' : 'icon-btn';
    return (
      <button
        ref={ref}
        type={type}
        className={`${base} motion-reduce:transition-none ${className}`.trim()}
        {...props}
      />
    );
  }
);

IconButton.displayName = 'IconButton';

export default IconButton;
