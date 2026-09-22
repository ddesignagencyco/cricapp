'use client';

import Image from 'next/image';

const REACTIONS = [
  { emoji: '🔥', label: 'Fire', src: '/reactions/fire.svg' },
  { emoji: '❤️', label: 'Love', src: '/reactions/love.svg' },
  { emoji: '👏', label: 'Applause', src: '/reactions/clap.svg' },
  { emoji: '😂', label: 'Funny', src: '/reactions/laugh.svg' },
] as const;

type ReactionSize = 'md' | 'sm' | 'xs';

interface ReactionBarProps {
  counts?: Record<string, number>;
  onReact: (_value: string) => void;
  size?: ReactionSize;
  disabled?: boolean;
}

const SIZE: Record<ReactionSize, { face: number; btn: string; count: string }> = {
  xs: { face: 16, btn: 'h-7 gap-0.5 py-0 pl-0.5 pr-1.5', count: 'text-[10px]' },
  sm: { face: 20, btn: 'h-8 gap-1 py-0 pl-1 pr-1.5', count: 'text-[11px]' },
  md: { face: 24, btn: 'h-9 gap-1 py-0 pl-1 pr-2', count: 'text-xs' },
};

export default function ReactionBar({
  counts = {},
  onReact,
  size = 'md',
  disabled = false,
}: ReactionBarProps) {
  const tone = SIZE[size];
  const face = tone.face;

  return (
    <div
      className="flex flex-wrap items-center gap-1 overflow-visible"
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
            className={`group/react relative inline-flex items-center rounded-full border bg-elevated/80 transition-colors duration-150 ease-out disabled:opacity-60 ${tone.btn} ${
              active
                ? 'border-accent/40 bg-accent/12 text-mtext'
                : 'border-lborder text-stext hover:border-accent/35 hover:bg-[var(--color-row-hover)] hover:text-mtext'
            }`}
          >
            <span
              className="grid place-items-center rounded-full transition-transform duration-150 ease-[cubic-bezier(.17,.89,.32,1.49)] group-hover/react:-translate-y-0.5 group-hover/react:scale-110 group-active/react:scale-95"
              style={{ width: face + 6, height: face + 6 }}
            >
              <Image
                src={src}
                alt=""
                width={face}
                height={face}
                draggable={false}
                aria-hidden="true"
                unoptimized
                className="pointer-events-none select-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.28)]"
                style={{ width: face, height: face }}
              />
            </span>
            {count > 0 && (
              <span
                className={`min-w-[1ch] font-bold tabular-nums leading-none ${tone.count} ${
                  active ? 'text-mtext' : 'text-stext'
                }`}
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
