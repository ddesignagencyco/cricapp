'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ToolDef } from '../../lib/toolsCatalog';
import { toolSource } from '../../lib/toolsCatalog';
import ToolDiamondIcon from './ToolDiamondIcon';

export default function ToolDiamondCard({ tool }: { tool: ToolDef }) {
  const source = toolSource(tool.kind);

  return (
    <Link href={`/tools/${tool.slug}`} className="tool-diamond-card group flex h-full flex-col">
      <span className="tool-diamond-card__gem" aria-hidden />
      <div className="flex items-start gap-3.5 p-4 sm:p-5">
        <ToolDiamondIcon kind={tool.kind} size={20} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold leading-snug text-mtext group-hover:text-accent transition-colors duration-200">
              {tool.title}
            </h3>
            <SourceBadge source={source} />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-stext">{tool.blurb}</p>
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-lborder/80 px-4 py-3 sm:px-5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-stext">Calculator</span>
        <span className="flex items-center gap-1 text-xs font-semibold text-accent">
          Open
          <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
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
