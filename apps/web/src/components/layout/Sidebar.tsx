import Link from 'next/link';
import { ArrowUpRight, CalendarDays } from 'lucide-react';
import { fetchNews } from '../../services/news';
import { formatScheduled } from '../../utils/helpers';
import AdBanner from '../AdBanner';

export default function Sidebar() {
  const latest = fetchNews().slice(0, 5);
  return (
    <aside className="space-y-6">
      <section className="rounded-2xl bg-card p-5 ring-1 ring-lborder">
        <header className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-mtext">
            Latest
          </h2>
          <Link
            href="/news"
            className="flex items-center gap-1 text-xs font-semibold text-accent transition-colors hover:text-accent2"
          >
            All news <ArrowUpRight size={14} />
          </Link>
        </header>
        <div className="divide-y divide-lborder/60">
          {latest.length > 0 ? (
            latest.map((item) => (
              <Link
                key={item.id}
                href={`/news/${item.id}`}
                className="group block py-3 first:pt-0 last:pb-0"
              >
                <p className="line-clamp-2 text-sm font-semibold text-mtext transition-colors group-hover:text-accent">
                  {item.title}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-stext">
                  <CalendarDays size={12} />
                  {formatScheduled(item.date).date} • {item.category}
                </p>
              </Link>
            ))
          ) : (
            <p className="py-2 text-sm text-stext">No recent news.</p>
          )}
        </div>
      </section>

      <AdBanner variant="vertical" />
    </aside>
  );
}
