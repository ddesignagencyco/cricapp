'use client';

import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { TOOL_GROUPS, TOOLS, type ToolGroup } from '../../lib/toolsCatalog';
import PageToolbar from '../PageToolbar';
import Tabs from '../Tabs';
import type { TabItem } from '../../types/index';
import ToolDiamondCard from './ToolDiamondCard';

type ToolsTabKey = ToolGroup | 'all';

const TAB_KEYS: ToolsTabKey[] = ['all', ...TOOL_GROUPS.map((g) => g.key)];

function isToolsTabKey(value: string): value is ToolsTabKey {
  return TAB_KEYS.includes(value as ToolsTabKey);
}

const TABS: TabItem[] = [
  { key: 'all', label: 'All' },
  { key: 'rates', label: 'Run rates' },
  { key: 'batting', label: 'Batting' },
  { key: 'bowling', label: 'Bowling' },
  { key: 'match', label: 'Match' },
  { key: 'analysis', label: 'Compare' },
  { key: 'odds', label: 'Odds' },
];

export default function ToolsHub() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawTab = searchParams.get('tab') || 'all';
  const tab: ToolsTabKey = isToolsTabKey(rawTab) ? rawTab : 'all';

  const activeGroup = TOOL_GROUPS.find((g) => g.key === tab);
  const filtered = tab === 'all' ? TOOLS : TOOLS.filter((tool) => tool.group === tab);
  const visibleCount = filtered.length;

  const handleTabChange = (newTab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newTab === 'all') params.delete('tab');
    else params.set('tab', newTab);
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
  };

  const tabLabel = useMemo(() => TABS.find((t) => t.key === tab)?.label?.toLowerCase() ?? tab, [tab]);

  return (
    <div className="space-y-5">
      <header>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-accent">Calculators</p>
            <h1 className="mt-1 text-2xl font-semibold text-mtext">Cricket Tools</h1>
            <p className="mt-1 max-w-2xl text-sm text-stext">
              Run rates, averages, match logic, comparisons and odds — most run in your browser; API tools use live or
              stored data.
            </p>
          </div>
          <p className="text-xs text-stext">
            <span className="font-semibold tabular-nums text-mtext">{visibleCount}</span> {tabLabel}
          </p>
        </div>
      </header>

      <PageToolbar>
        <div className="no-scrollbar max-w-full overflow-x-auto">
          <Tabs tabs={TABS} active={tab} onChange={handleTabChange} />
        </div>
      </PageToolbar>

      {activeGroup ? (
        <p className="text-sm text-stext">{activeGroup.hint}</p>
      ) : tab === 'all' ? (
        <p className="text-sm text-stext">All calculators in one place, grouped by category below.</p>
      ) : null}

      {tab === 'all' ? (
        <div className="space-y-8">
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
                  {tools.map((tool) => (
                    <li key={tool.slug}>
                      <ToolDiamondCard tool={tool} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((tool) => (
            <li key={tool.slug}>
              <ToolDiamondCard tool={tool} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
