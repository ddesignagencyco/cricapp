import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Eye, Trophy, Users, Newspaper, Calendar, TrendingUp } from 'lucide-react';

interface CricketHeroProps {
  match?: any;
}

/**
 * Static hero — deliberately a Server Component. The copy never depends on the
 * `match` prop, so making it client would only block LCP hydration. The
 * photographic background is the LCP element: it renders via `next/image` with
 * `priority` (preload + high fetch priority + AVIF/WebP + responsive sizing)
 * instead of a 1.9 MB CSS background.
 */
export default function CricketHero({ match: _match }: CricketHeroProps) {
  return (
    <section className="hero-grad-home relative flex items-center overflow-hidden sm:min-h-[360px]">
      <Image
        src="/banner.png"
        alt=""
        aria-hidden="true"
        fill
        preload
        sizes="100vw"
        quality={85}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="hero-scrim pointer-events-none absolute inset-0" />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-12">
        {/* Phones: compact, so the live matches below start within the first screen. */}
        <div className="flex flex-col gap-5 sm:gap-8 lg:flex-row lg:items-center lg:justify-between">
          {/* Left content */}
          <div className="max-w-2xl">
            <h1 className="hero-title text-3xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              EVERY BALL{' '}
              <span className="text-danger relative">
                . LIVE
              </span>
            </h1>

            <p className="hero-lead mt-3 max-w-xl text-sm leading-relaxed sm:mt-4 sm:text-lg">
              From the first ball to the final over, experience every moment that makes cricket
              unforgettable.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-8 sm:flex sm:flex-wrap sm:items-center">
              <Link
                href="/matches"
                className="btn-brand on-media group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-3 text-sm font-semibold sm:gap-2.5 sm:px-7 sm:py-3.5"
              >
                <Eye size={17} aria-hidden="true" />
                View Matches
                <ChevronRight size={17} aria-hidden="true" className="hidden transition-transform duration-150 group-hover:translate-x-1 sm:block" />
              </Link>
              <Link
                href="/teams"
                className="btn-on-media on-media inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-3 text-sm font-semibold ring-1 ring-white/25 sm:gap-2.5 sm:px-7 sm:py-3.5"
              >
                <Users size={17} aria-hidden="true" />
                Explore Teams
              </Link>
            </div>
          </div>

          {/* Right — Quick links grid */}
          <div className="grid w-full grid-cols-2 gap-2.5 sm:max-w-sm sm:gap-4 lg:max-w-xs">
            {[
              { icon: Calendar, label: 'Schedule', sub: 'Fixtures & Results', href: '/schedules' },
              { icon: Trophy, label: 'PSL 2026', sub: 'Points Table & More', href: '/psl' },
              { icon: Newspaper, label: 'News', sub: 'Latest Stories', href: '/news' },
              { icon: TrendingUp, label: 'Rankings', sub: 'Top Players', href: '/players' },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="hero-tile on-media group flex min-w-0 items-center gap-2.5 rounded-md p-3 ring-1 sm:flex-col sm:items-start sm:gap-2 sm:p-4 ring-white/15 transition-colors duration-150 hover:ring-white/30"
              >
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white/10 sm:h-9 sm:w-9">
                  <item.icon size={18} aria-hidden="true" className="text-on-media-accent" />
                </div>
                <div className="min-w-0">
                  <p className="group-hover:text-on-media-accent truncate text-sm font-semibold text-white transition-colors duration-150">{item.label}</p>
                  <p className="text-on-media-muted truncate text-xs font-medium">{item.sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
