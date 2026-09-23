'use client';

import { Search } from 'lucide-react';
import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

export const searchPillInputClass =
  'search-pill w-full py-2.5 pl-10 pr-4 text-sm text-mtext';

export interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  type?: 'search' | 'text';
  wrapperClassName?: string;
  iconClassName?: string;
  inputClassName?: string;
  trailing?: ReactNode;
  iconSize?: number;
}

/** Site-wide search input: icon + 3D pill styling (`globals.css` `.search-pill`). */
const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  {
    type = 'search',
    wrapperClassName = '',
    iconClassName = 'text-stext',
    inputClassName = '',
    trailing,
    iconSize = 16,
    className = '',
    autoComplete = 'off',
    ...props
  },
  ref
) {
  const padRight = trailing ? 'pr-20' : '';
  return (
    <div className={`relative w-full ${wrapperClassName}`.trim()}>
      <Search
        size={iconSize}
        aria-hidden="true"
        className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${iconClassName}`}
      />
      <input
        ref={ref}
        type={type}
        autoComplete={autoComplete}
        className={`${searchPillInputClass} ${padRight} ${inputClassName} ${className}`.trim()}
        {...props}
      />
      {trailing ? <div className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</div> : null}
    </div>
  );
});

export default SearchField;
