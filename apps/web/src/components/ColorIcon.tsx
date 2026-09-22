import EntityAvatar from './EntityAvatar';
import { getInitials } from '../utils/helpers';

interface ColorIconProps {
  label: string;
  size?: number;
  className?: string;
}

export default function ColorIcon({ label, size = 36, className = '' }: ColorIconProps) {
  return (
    <EntityAvatar
      className={`font-black ${className}`}
      title={label}
      style={{ width: size, height: size, fontSize: Math.max(8, Math.round(size * 0.3)) }}
    >
      {getInitials(label)}
    </EntityAvatar>
  );
}
