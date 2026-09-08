import { getInitials } from '../utils/helpers';

interface ColorIconProps {
  label: string;
  size?: number;
  className?: string;
}

export default function ColorIcon({ label, size = 36, className = '' }: ColorIconProps) {
  let hash = 0;
  const key = label || '?';
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);

  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full border border-white/10 font-black text-white ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(8, Math.round(size * 0.3)),
        backgroundImage: `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${(hue + 40) % 360}, 80%, 35%))`,
      }}
      title={label}
    >
      {getInitials(label)}
    </span>
  );
}