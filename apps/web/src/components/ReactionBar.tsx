'use client';

const REACTIONS = [
  { emoji: '🔥', label: 'Fire' },
  { emoji: '❤️', label: 'Love' },
  { emoji: '👏', label: 'Applause' },
  { emoji: '😂', label: 'Funny' },
] as const;

interface ReactionBarProps {
  counts?: Record<string, number>;
  onReact: (value: string) => void;
  size?: 'md' | 'sm';
  disabled?: boolean;
}

export default function ReactionBar({
  counts = {},
  onReact,
  size = 'md',
  disabled = false,
}: ReactionBarProps) {
  const compact = size === 'sm';
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Reactions">
      {REACTIONS.map(({ emoji, label }) => {
        const count = counts[emoji] || 0;
        const active = count > 0;
        return (
          <button
            key={emoji}
            type="button"
            disabled={disabled}
            onClick={() => onReact(emoji)}
            aria-label={`${label}${count ? `, ${count}` : ''}`}
            className={`inline-flex items-center gap-1.5 rounded-full border transition-colors disabled:opacity-60 ${
              compact ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
            } ${
              active
                ? 'border-accent/35 bg-accent/10 text-mtext'
                : 'border-lborder bg-elevated text-stext hover:border-accent/30 hover:bg-card hover:text-mtext'
            }`}
          >
            <span aria-hidden="true">{emoji}</span>
            <span className={`font-semibold tabular-nums ${active ? 'text-mtext' : 'text-stext'}`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
