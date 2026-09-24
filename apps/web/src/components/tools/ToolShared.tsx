import Link from 'next/link';
import type { ReactNode } from 'react';
import { TOOL_GROUPS, TOOLS, toolBySlug, toolSource, type ToolDef } from '../../lib/toolsCatalog';
import ToolDiamondCard from './ToolDiamondCard';
import ToolDiamondIcon from './ToolDiamondIcon';

const toolFieldBase =
  'w-full rounded-md border border-lborder bg-secondary px-3 py-2.5 text-sm font-semibold text-mtext outline-none transition-colors focus:border-[var(--color-focus-ring)] focus:ring-2 focus:ring-[var(--color-focus-ring)]/25';

export const toolInputClass = `${toolFieldBase} font-mono tabular-nums`;

export const toolTextInputClass = toolFieldBase;

export const toolSelectClass =
  'w-full rounded-md border border-lborder bg-secondary px-3 py-2.5 text-sm font-semibold text-mtext outline-none focus:border-[var(--color-focus-ring)] focus:ring-2 focus:ring-[var(--color-focus-ring)]/25';

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
        className={toolInputClass}
      />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (_next: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stext">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={toolSelectClass}>
        {children}
      </select>
    </label>
  );
}

export function ToolCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (_next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-md border border-lborder/80 bg-secondary/60 px-3 py-2.5 text-sm text-mtext">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-lborder accent-[var(--color-brand)]"
      />
      {label}
    </label>
  );
}

export function ResultBox({ label = 'Result', value }: { label?: string; value: string }) {
  return (
    <div className="tool-result-hero">
      <p className="text-[10px] font-bold uppercase tracking-widest text-stext">{label}</p>
      <p className="tool-result-hero__value mt-3 break-words font-mono text-3xl font-black leading-tight tabular-nums text-accent">
        {value || '—'}
      </p>
    </div>
  );
}

function SourceBadge({ source }: { source: 'formula' | 'api' | 'stored' }) {
  const cls =
    source === 'formula'
      ? 'bg-secondary text-stext'
      : source === 'api'
        ? 'bg-brand-soft text-accent'
        : 'bg-accent/10 text-accent';

  const label = source === 'formula' ? 'Formula' : source === 'api' ? 'API' : 'Stored';

  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

export function ToolPageHeader({ tool }: { tool: ToolDef }) {
  const group = TOOL_GROUPS.find((item) => item.key === tool.group);
  const source = toolSource(tool.kind);

  return (
    <header>
      <div className="flex flex-wrap items-start gap-4">
        <ToolDiamondIcon kind={tool.kind} size={22} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-accent">{group?.title ?? 'Tools'}</p>
            <SourceBadge source={source} />
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-mtext">{tool.title}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-stext">{tool.blurb}</p>
        </div>
      </div>
    </header>
  );
}

/** @deprecated Use ToolPageHeader */
export function ToolIntro({ tool }: { tool: ToolDef }) {
  return <ToolPageHeader tool={tool} />;
}

export function ToolNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-lborder/80 bg-secondary/40 px-3 py-2.5 text-xs leading-relaxed text-stext">
      {children}
    </p>
  );
}

export function ToolPanel({
  children,
  aside,
  className = '',
}: {
  children: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`tool-page-panel ${className}`.trim()}>
      <div
        className={
          aside
            ? 'grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_min(100%,280px)] lg:items-start lg:gap-8'
            : 'p-4 sm:p-6'
        }
      >
        <div className="space-y-4">{children}</div>
        {aside ? <aside className="space-y-3 lg:sticky lg:top-20">{aside}</aside> : null}
      </div>
    </div>
  );
}

export function ToolPage({
  tool,
  note,
  children,
}: {
  tool: ToolDef;
  note?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-5">
      <ToolPageHeader tool={tool} />
      {note ? <ToolNote>{note}</ToolNote> : null}
      {children}
      <MoreTools currentSlug={tool.slug} />
    </div>
  );
}

export function MoreTools({ currentSlug }: { currentSlug: string }) {
  const current = toolBySlug(currentSlug);
  const others = TOOLS.filter((item) => item.slug !== currentSlug);
  const sameGroup = others.filter((item) => item.group === current?.group);
  const rest = others.filter((item) => item.group !== current?.group);
  const tools = [...sameGroup, ...rest].slice(0, 6);

  if (tools.length === 0) return null;

  return (
    <section className="border-t border-lborder pt-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-mtext">More tools</h2>
          <p className="mt-0.5 text-xs text-stext">Related calculators from the same hub.</p>
        </div>
        <Link href="/tools" className="text-xs font-semibold text-accent hover:underline">
          All tools
        </Link>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {tools.map((item) => (
          <li key={item.slug}>
            <ToolDiamondCard tool={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function num(value: string): number {
  return Number(value) || 0;
}
