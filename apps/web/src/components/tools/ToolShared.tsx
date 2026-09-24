import Link from 'next/link';
import { TOOLS, type ToolDef } from '../../lib/toolsCatalog';
import { ToolGlyph } from './toolIcons';

export function Field({
  label,
  value,
  onChange,
  step = 'any',
}: {
  label: string;
  value: string;
  onChange: (_next: string) => void;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stext">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-lborder bg-secondary px-3 py-2.5 font-mono text-sm font-semibold tabular-nums text-mtext outline-none transition-colors focus:border-accent"
      />
    </label>
  );
}

export function ResultBox({ label = 'Result', value }: { label?: string; value: string }) {
  return (
    <div className="rounded-md border border-lborder bg-secondary px-4 py-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-stext">{label}</p>
      <p className="mt-3 break-words font-mono text-3xl font-black leading-tight tabular-nums text-accent">
        {value || '—'}
      </p>
    </div>
  );
}

export function ToolIntro({ tool }: { tool: ToolDef }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-lborder bg-card text-accent">
        <ToolGlyph kind={tool.kind} size={20} />
      </span>
      <div className="min-w-0">
        <h1 className="text-2xl font-black tracking-tight text-mtext sm:text-3xl">{tool.title}</h1>
        <p className="mt-1 text-sm text-stext">{tool.blurb}</p>
      </div>
    </div>
  );
}

export function MoreTools({ currentSlug }: { currentSlug: string }) {
  const tools = TOOLS.filter((item) => item.slug !== currentSlug).slice(0, 6);
  if (tools.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-sm font-bold text-mtext">More tools</h2>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {tools.map((item) => (
          <li key={item.slug}>
            <Link
              href={`/tools/${item.slug}`}
              className="flex items-center gap-3 rounded-md border border-lborder bg-card px-3 py-2.5 transition-colors hover:border-accent"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-lborder bg-secondary text-accent">
                <ToolGlyph kind={item.kind} size={14} />
              </span>
              <span className="min-w-0 truncate text-sm font-semibold text-mtext">{item.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function num(value: string): number {
  return Number(value) || 0;
}
