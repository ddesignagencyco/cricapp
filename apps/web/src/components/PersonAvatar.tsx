import Link from 'next/link';
import RemoteImage from './RemoteImage';
import { getInitials } from '../utils/helpers';

function hueFromName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash % 360);
}

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
  const hue = hueFromName(seed);
  const fontSize = Math.max(9, Math.round(size * 0.36));

  if (photo) {
    return (
      <RemoteImage
        src={photo}
        alt={seed}
        width={size}
        height={size}
        className={`avatar-3d shrink-0 rounded-full bg-secondary object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className={`avatar-3d grid shrink-0 place-items-center rounded-full font-semibold text-white ${className}`}
      style={{
        width: size,
        height: size,
        fontSize,
        backgroundImage: `linear-gradient(135deg, hsl(${hue}, 68%, 46%), hsl(${(hue + 38) % 360}, 72%, 32%))`,
      }}
      aria-hidden="true"
    >
      {getInitials(seed)}
    </span>
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
