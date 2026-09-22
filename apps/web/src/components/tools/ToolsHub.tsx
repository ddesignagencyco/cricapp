'use client';

import Link from 'next/link';
import { ArrowRight, Wrench } from 'lucide-react';
import { TOOL_GROUPS, TOOLS, toolSource } from '../../lib/toolsCatalog';
import { ToolGlyph } from './toolIcons';

export default function ToolsHub() {
  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6">
      <header className="elev-card overflow-hidden rounded-2xl border border-lborder bg-card">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-stext">
              <Wrench size={14} className="text-accent" />
              Calculators
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-mtext sm:text-4xl">Tools</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-stext">
              Most tools run in the browser from the numbers you type. Player and H2H tools only read stored directory data.
            </p>
          </div>
          <p className="shrink-0 text-xs text-stext">
            <span className="font-semibold tabular-nums text-mtext">{TOOLS.length}</span> tools
          </p>
        </div>
      </header>

      {TOOL_GROUPS.map((group) => {
        const tools = TOOLS.filter((tool) => tool.group === group.key);
        if (tools.length === 0) return null;
        return (
          <section key={group.key}>
            <div className="mb-3.5">
              <h2 className="text-sm font-bold tracking-tight text-mtext">{group.title}</h2>
              <p className="mt-0.5 text-xs text-stext">{group.hint}</p>
            </div>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {tools.map((tool) => {
                const source = toolSource(tool.kind);
                return (
                  <li key={tool.slug}>
                    <Link
                      href={`/tools/${tool.slug}`}
                      className="elev-card group flex h-full flex-col rounded-2xl border border-lborder bg-card p-4 transition-colors hover:border-accent/50 hover:bg-[var(--color-row-hover)]"
                    >
                      <div className="flex items-start gap-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-accent/15 bg-accent/10 text-accent">
                          <ToolGlyph kind={tool.kind} size={18} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-bold leading-snug text-mtext">{tool.title}</p>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                source === 'formula'
                                  ? 'bg-secondary text-stext'
                                  : 'bg-accent/10 text-accent'
                              }`}
                            >
                              {source === 'formula' ? 'Formula' : 'Stored'}
                            </span>
                          </div>
                          <p className="mt-1.5 text-xs leading-relaxed text-stext">{tool.blurb}</p>
                        </div>
                      </div>
                      <p className="mt-auto flex items-center gap-1 pt-4 text-xs font-semibold text-accent">
                        Open
                        <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
