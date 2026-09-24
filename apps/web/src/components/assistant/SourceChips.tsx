import Link from 'next/link';
import type { AssistantSource } from '../../services/assistant';
import { sourceChipLabel, sourceHref } from '../../lib/assistant';

export default function SourceChips({ sources }: { sources: AssistantSource[] }) {
  if (!sources.length) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-stext">Sources</span>
      {sources.map((source, index) => {
        const href = sourceHref(source);
        const label = sourceChipLabel(source);
        const key = `${source.type}-${source.id || source.matchId || index}`;
        if (!href) {
          return (
            <span
              key={key}
              className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-mtext ring-1 ring-lborder"
            >
              {label}
            </span>
          );
        }
        return (
          <Link
            key={key}
            href={href}
            className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent ring-1 ring-accent/20 hover:bg-accent/15"
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
