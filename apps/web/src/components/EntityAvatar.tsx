import type { CSSProperties, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  title?: string;
  className?: string;
  style?: CSSProperties;
}

/** Initials circle for teams, players and match sides. Colour is theme-stable. */
export default function EntityAvatar({ children, title, className = '', style }: Props) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-entity-avatar font-semibold text-entity-avatar-fg ${className}`}
      style={style}
      title={title}
      aria-hidden={!title}
    >
      {children}
    </span>
  );
}
