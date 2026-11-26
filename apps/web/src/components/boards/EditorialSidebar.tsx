'use client';

import Link from 'next/link';
import { ArrowRight, Calculator, Compass, Tag } from 'lucide-react';
import AdSlot from '../advertisements/AdSlot';

export type SidebarWidget = 'topics' | 'tools' | 'news' | 'gallery';

interface EditorialSidebarProps {
  topPlacement: string;
  bottomPlacement?: string;
  widget?: SidebarWidget;
  /** @deprecated kept for call-site compatibility */
  showNews?: boolean;
  /** @deprecated kept for call-site compatibility */
  showGallery?: boolean;
}

const NEWS_CATEGORY_TAGS = [
  { label: 'Pakistan Cricket', href: '/news?category=pakistan-cricket' },
  { label: 'PSL', href: '/news?category=psl' },
  { label: 'International', href: '/news?category=international' },
  { label: 'IPL', href: '/news?category=ipl' },
  { label: 'Match News', href: '/news?category=match-news' },
  { label: 'Analysis', href: '/news?category=analysis' },
  { label: 'Features', href: '/news?category=features' },
  { label: 'Records', href: '/news?category=records' },
  { label: 'Interviews', href: '/news?category=interviews' },
  { label: 'Urdu News', href: '/ur/news' },
];

const QUICK_TOOLS = [
  { slug: 'net-run-rate', title: 'Net Run Rate (NRR)', desc: 'Calculate tournament NRR scenarios' },
  { slug: 'required-run-rate', title: 'Required Run Rate', desc: 'Target & chase rate calculator' },
  { slug: 'dls-calculator', title: 'DLS Target Calculator', desc: 'Rain-affected par score estimator' },
  { slug: 'player-comparison', title: 'Player Comparison', desc: 'Compare head-to-head career stats' },
];

const EXPLORE_LINKS = [
  { label: 'Live Cricket Scores', href: '/matches?tab=live' },
  { label: 'PSL 2026 Points Table & Stats', href: '/psl' },
  { label: 'Upcoming Match Schedule', href: '/schedules' },
  { label: 'AI Match Predictions', href: '/predictions' },
  { label: 'Cricket Photo Gallery', href: '/gallery' },
];

export default function EditorialSidebar({
  topPlacement,
  bottomPlacement,
  widget = 'topics',
}: EditorialSidebarProps) {
  const showTools = widget === 'tools';

  return (
    <aside className="hidden lg:sticky lg:top-20 lg:flex lg:flex-col lg:gap-6">
      <div className="flex justify-center empty:hidden">
        <AdSlot placement={topPlacement} />
      </div>

      {showTools ? (
        <section className="rounded-xl border border-lborder bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-mtext">
              <Calculator size={13} className="text-accent" aria-hidden />
              Cricket Tools
            </h3>
            <Link href="/tools" className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-accent hover:underline">
              All tools <ArrowRight size={11} />
            </Link>
          </div>
          <div className="space-y-2">
            {QUICK_TOOLS.map((tool) => (
              <Link
                key={tool.slug}
                href={`/tools/${tool.slug}`}
                className="group block rounded-lg border border-lborder/60 bg-secondary/30 px-3 py-2 transition-colors hover:border-accent/40 hover:bg-secondary/60"
              >
                <p className="text-xs font-semibold text-mtext group-hover:text-accent">{tool.title}</p>
                <p className="mt-0.5 text-[11px] text-stext">{tool.desc}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-lborder bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-mtext">
              <Tag size={13} className="text-accent" aria-hidden />
              Trending Topics
            </h3>
            <Link href="/news" className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-accent hover:underline">
              All news <ArrowRight size={11} />
            </Link>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {NEWS_CATEGORY_TAGS.map((tag) => (
              <Link
                key={tag.href}
                href={tag.href}
                className="rounded-full border border-lborder bg-secondary/40 px-2.5 py-1 text-xs font-medium text-mtext transition-colors hover:border-accent/50 hover:bg-accent/10 hover:text-accent"
              >
                {tag.label}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-lborder bg-card p-4 shadow-sm">
        <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-mtext">
          <Compass size={13} className="text-accent" aria-hidden />
          Explore CriczApp
        </h3>
        <ul className="divide-y divide-lborder/50">
          {EXPLORE_LINKS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="group flex items-center justify-between py-2 text-xs font-medium text-stext transition-colors hover:text-accent"
              >
                <span>{item.label}</span>
                <ArrowRight size={12} className="opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {bottomPlacement ? (
        <div className="flex justify-center empty:hidden">
          <AdSlot placement={bottomPlacement} />
        </div>
      ) : null}
    </aside>
  );
}
