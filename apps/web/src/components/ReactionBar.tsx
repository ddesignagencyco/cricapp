'use client';

const REACTIONS = [
  { emoji: '🔥', label: 'Fire', src: '/reactions/fire.svg' },
  { emoji: '❤️', label: 'Love', src: '/reactions/love.svg' },
  { emoji: '👏', label: 'Applause', src: '/reactions/clap.svg' },
  { emoji: '😂', label: 'Funny', src: '/reactions/laugh.svg' },
] as const;

interface ReactionBarProps {
  counts?: Record<string, number>;
  onReact: (_value: string) => void;
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
  const face = compact ? 24 : 32;

  return (
    <div
      className="flex flex-wrap items-end gap-1 overflow-visible"
      role="group"
      aria-label="Reactions"
    >
      {REACTIONS.map(({ emoji, label, src }) => {
        const count = counts[emoji] || 0;
        const active = count > 0;
        return (
          <button
            key={emoji}
            type="button"
            disabled={disabled}
            onClick={() => onReact(emoji)}
            aria-label={`${label}${count ? `, ${count}` : ''}`}
            aria-pressed={active}
            className={`group/react relative inline-flex items-center rounded-full border bg-elevated/80 shadow-sm transition-[transform,background-color,border-color,box-shadow] duration-150 ease-out disabled:opacity-60 ${
              compact ? 'h-9 gap-1 py-0 pl-1 pr-2' : 'h-11 gap-1.5 py-0 pl-1.5 pr-2.5'
            } ${
              active
                ? 'border-accent/40 bg-accent/12 text-mtext shadow-[0_0_0_1px_rgba(56,189,248,0.12)]'
                : 'border-lborder text-stext hover:border-accent/35 hover:bg-card hover:text-mtext hover:shadow-md'
            }`}
          >
            <span
              className="grid place-items-center rounded-full transition-transform duration-150 ease-[cubic-bezier(.17,.89,.32,1.49)] group-hover/react:-translate-y-1 group-hover/react:scale-125 group-active/react:scale-95"
              style={{ width: face + 8, height: face + 8 }}
            >
              <img
                src={src}
                alt=""
                width={face}
                height={face}
                draggable={false}
                aria-hidden="true"
                className="pointer-events-none select-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.28)]"
                style={{ width: face, height: face }}
              />
            </span>
            {count > 0 && (
              <span
                className={`min-w-[1ch] font-bold tabular-nums leading-none ${
                  compact ? 'text-xs' : 'text-sm'
                } ${active ? 'text-mtext' : 'text-stext'}`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
