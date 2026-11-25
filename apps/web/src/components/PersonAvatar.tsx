import Link from 'next/link';
import RemoteImage from './RemoteImage';
import EntityAvatar from './EntityAvatar';
import { getInitials } from '../utils/helpers';

export default function PersonAvatar({
  name,
  src,
  size = 28,
  className = '',
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const seed = name.trim() || '?';
  const photo = src?.trim() || '';
  const fontSize = Math.max(9, Math.round(size * 0.36));

  if (photo) {
    return (
      <RemoteImage
        src={photo}
        alt={seed}
        width={size}
        height={size}
        className={`avatar-3d shrink-0 rounded-full bg-entity-avatar object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <EntityAvatar
      className={className}
      style={{
        width: size,
        height: size,
        fontSize,
      }}
    >
      {getInitials(seed)}
    </EntityAvatar>
  );
}

export function AuthorByline({
  name,
  src,
  href,
  size = 20,
  className = '',
}: {
  name?: string | null;
  src?: string | null;
  href?: string;
  size?: number;
  className?: string;
}) {
  if (!name) return null;
  const inner = (
    <>
      <PersonAvatar name={name} src={src} size={size} />
      <span className={href ? 'truncate font-semibold text-accent' : 'truncate font-medium text-mtext'}>{name}</span>
    </>
  );
  if (href) {
    return (
      <Link href={href} className={`flex min-w-0 items-center gap-1.5 hover:text-accent ${className}`}>
        {inner}
      </Link>
    );
  }
  return <span className={`flex min-w-0 items-center gap-1.5 ${className}`}>{inner}</span>;
}
