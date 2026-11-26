'use client';

import { Loader2 } from 'lucide-react';
import { createContext, useContext, type CSSProperties, type ReactNode } from 'react';
import 'react-loading-skeleton/dist/skeleton.css';

function toCssSize(value?: string | number): string | undefined {
  if (value === undefined || value === null) return undefined;
  return typeof value === 'number' ? `${value}px` : value;
}

interface SkeletonTone {
  baseColor?: string;
  highlightColor?: string;
}

const SkeletonToneContext = createContext<SkeletonTone>({});

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  borderRadius?: string | number;
  className?: string;
  containerClassName?: string;
  count?: number;
  style?: CSSProperties;
}

export function Skeleton({
  width,
  height,
  circle = false,
  borderRadius = 4,
  className = '',
  containerClassName,
  count = 1,
  style,
}: SkeletonProps) {
  const tone = useContext(SkeletonToneContext);
  const radius = circle ? '50%' : toCssSize(borderRadius);
  const lineCount = Math.max(1, count);
  const multiline = !circle && lineCount > 1;
  const boneWidth = multiline ? '100%' : toCssSize(width) ?? '100%';
  const boneStyle = {
    width: boneWidth,
    height: toCssSize(height),
    borderRadius: radius,
    lineHeight: 1,
    display: 'block',
    '--base-color': tone.baseColor || 'var(--color-skeleton)',
    '--highlight-color': tone.highlightColor || 'var(--color-skeleton-highlight)',
    backgroundColor: tone.baseColor || 'var(--color-skeleton)',
    ...style,
  } as CSSProperties;

  const wrapperClass = [
    circle ? 'inline-block shrink-0 leading-none' : multiline ? 'flex w-full flex-col gap-2' : 'block max-w-full leading-none',
    containerClassName,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={wrapperClass} aria-live="polite" aria-busy="true">
      {Array.from({ length: lineCount }, (_, index) => (
        <span key={index} className={`react-loading-skeleton ${className}`.trim()} style={boneStyle}>
          {'\u200c'}
        </span>
      ))}
    </span>
  );
}

/** Vertical title + optional subtitle (avoids inline skeleton bars beside the heading). */
export function SkeletonTextBlock({
  titleWidth = 220,
  titleHeight = 26,
  subtitleWidth = 140,
  showSubtitle = true,
  className = '',
}: {
  titleWidth?: number | string;
  titleHeight?: number;
  subtitleWidth?: number | string;
  showSubtitle?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-2 ${className}`.trim()}>
      <Skeleton width={titleWidth} height={titleHeight} />
      {showSubtitle ? <Skeleton width={subtitleWidth} height={12} /> : null}
    </div>
  );
}

/** Matches team / player profile header chrome while loading. */
export function EntityProfileHeaderSkeleton() {
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center justify-between border-b border-lborder pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton width={88} height={26} borderRadius={4} containerClassName="inline-block" />
          <Skeleton width={52} height={26} borderRadius={4} containerClassName="inline-block" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton circle width={36} height={36} />
          <Skeleton circle width={36} height={36} />
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
        <Skeleton circle width={80} height={80} containerClassName="shrink-0" />
        <SkeletonTextBlock titleWidth={220} titleHeight={26} subtitleWidth={150} className="flex-1" />
      </div>
    </Card>
  );
}

export function AppSkeletonTheme({ children }: { children: ReactNode; theme?: string }) {
  return children;
}

function Page({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mx-auto max-w-site px-4 py-8 sm:px-6 ${className}`} aria-busy="true" aria-label="Loading">
      {children}
    </div>
  );
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-md border border-lborder bg-card ${className}`}>{children}</div>;
}

export function MatchCardSkeleton({ dense = false }: { dense?: boolean }) {
  const pad = dense ? 'p-2.5' : 'p-3.5';
  const avatar = dense ? 24 : 28;
  return (
    <Card className={pad}>
      <div className={`flex items-center justify-between ${dense ? 'mb-1.5' : 'mb-2.5'}`}>
        <Skeleton width="55%" height={dense ? 8 : 10} />
        <Skeleton width={dense ? 56 : 72} height={dense ? 14 : 18} borderRadius={999} />
      </div>
      <div className={dense ? 'space-y-1' : 'space-y-2'}>
        <div className={`flex items-center ${dense ? 'gap-2' : 'gap-2.5'}`}>
          <Skeleton circle width={avatar} height={avatar} />
          <div className="min-w-0 flex-1">
            <Skeleton width="88%" height={dense ? 10 : 12} />
          </div>
          <Skeleton
            width={dense ? 28 : 40}
            height={dense ? 10 : 12}
            containerClassName="inline-block shrink-0"
          />
        </div>
        <div className={`flex items-center ${dense ? 'gap-2' : 'gap-2.5'}`}>
          <Skeleton circle width={avatar} height={avatar} />
          <div className="min-w-0 flex-1">
            <Skeleton width="82%" height={dense ? 10 : 12} />
          </div>
          <Skeleton
            width={dense ? 28 : 40}
            height={dense ? 10 : 12}
            containerClassName="inline-block shrink-0"
          />
        </div>
      </div>
      <div
        className={`flex items-center justify-between border-t border-lborder ${dense ? 'mt-2 pt-1.5' : 'mt-2.5 pt-2'}`}
      >
        <Skeleton width={dense ? 64 : 88} height={dense ? 8 : 10} />
        <Skeleton width={dense ? 40 : 56} height={dense ? 8 : 12} />
      </div>
    </Card>
  );
}

export function MatchCardGridSkeleton({
  count = 6,
  dense = false,
  columns = 'default',
}: {
  count?: number;
  dense?: boolean;
  columns?: 'default' | 'four';
}) {
  const gridClass =
    columns === 'four'
      ? 'grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4'
      : 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3';
  return (
    <div className={gridClass}>
      {Array.from({ length: count }).map((_, i) => (
        <MatchCardSkeleton key={i} dense={dense} />
      ))}
    </div>
  );
}

export function DirectoryRowSkeleton() {
  return (
    <Card className="flex items-center gap-3 p-3.5">
      <Skeleton circle width={40} height={40} />
      <div className="min-w-0 flex-1">
        <Skeleton width="62%" height={12} />
        <Skeleton width="38%" height={10} className="mt-2" />
      </div>
    </Card>
  );
}

export function DirectoryGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <DirectoryRowSkeleton key={i} />
      ))}
    </div>
  );
}

export function NewsCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton height={160} className="!block !rounded-none" />
      <div className="p-4">
        <Skeleton width="88%" height={14} />
        <Skeleton width="100%" height={10} className="mt-3" />
        <Skeleton width="70%" height={10} className="mt-2" />
        <div className="mt-4 flex justify-between">
          <Skeleton width={72} height={10} />
          <Skeleton width={56} height={10} />
        </div>
      </div>
    </Card>
  );
}

export function CommentListSkeleton({ count = 2 }: { count?: number }) {
  return (
    <ul className="divide-y divide-lborder">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="py-3">
          <div className="flex items-start gap-2.5">
            <Skeleton circle width={28} height={28} />
            <div className="min-w-0 flex-1">
              <Skeleton width={110} height={10} />
              <Skeleton width={72} height={8} className="mt-1.5" />
              <Skeleton height={10} className="mt-2" />
              <div className="mt-2 flex gap-1">
                <Skeleton width={28} height={20} borderRadius={999} />
                <Skeleton width={28} height={20} borderRadius={999} />
                <Skeleton width={28} height={20} borderRadius={999} />
                <Skeleton width={28} height={20} borderRadius={999} />
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function PageHeaderSkeleton({ subtitle = true }: { subtitle?: boolean }) {
  return (
    <header className="mb-6 space-y-2">
      <Skeleton width={96} height={10} />
      <Skeleton width={260} height={28} />
      {subtitle ? <Skeleton width="55%" height={12} /> : null}
    </header>
  );
}

export function HomeSkeleton() {
  return (
    <div className="min-h-screen" aria-busy="true" aria-label="Loading">
      {/* Match Ticker Bar */}
      <div className="border-b border-lborder">
        <div className="mx-auto max-w-full px-4 sm:px-6">
          <div className="flex items-center gap-2 py-3 sm:gap-3">
            <Skeleton circle width={28} height={28} containerClassName="shrink-0" />
            <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 py-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card
                  key={i}
                  className={`p-3 ${i >= 1 ? 'hidden sm:block' : ''} ${i >= 2 ? 'sm:hidden lg:block' : ''} ${i >= 3 ? 'lg:hidden xl:block' : ''}`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Skeleton width="58%" height={10} />
                    <Skeleton width={46} height={16} borderRadius={999} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Skeleton circle width={22} height={22} />
                      <Skeleton width="64%" height={12} containerClassName="flex-1" />
                      <Skeleton width={38} height={12} containerClassName="shrink-0" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton circle width={22} height={22} />
                      <Skeleton width="58%" height={12} containerClassName="flex-1" />
                      <Skeleton width={38} height={12} containerClassName="shrink-0" />
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between border-t border-lborder pt-1.5">
                    <Skeleton width={88} height={9} />
                    <Skeleton width={64} height={9} />
                  </div>
                </Card>
              ))}
            </div>
            <Skeleton circle width={28} height={28} containerClassName="shrink-0" />
          </div>
        </div>
      </div>

      {/* Cricket Hero */}
      <section className="relative flex items-center overflow-hidden border-b border-lborder bg-secondary/40 sm:min-h-[360px]">
        <div className="mx-auto w-full max-w-site px-4 py-6 sm:px-6 sm:py-12">
          <div className="flex flex-col gap-5 sm:gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl flex-1 space-y-4">
              <Skeleton width="72%" height={44} />
              <Skeleton width="86%" height={16} />
              <Skeleton width="62%" height={16} />
              <div className="flex flex-wrap gap-3 pt-2">
                <Skeleton width={160} height={46} borderRadius={10} />
                <Skeleton width={160} height={46} borderRadius={10} />
              </div>
            </div>
            <div className="grid w-full grid-cols-2 gap-2.5 sm:max-w-sm sm:gap-4 lg:max-w-xs">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="flex items-center gap-2.5 p-3 sm:flex-col sm:items-start sm:gap-2 sm:p-4">
                  <Skeleton width={34} height={34} borderRadius={8} containerClassName="shrink-0" />
                  <div className="w-full space-y-1.5">
                    <Skeleton width="70%" height={13} />
                    <Skeleton width="88%" height={10} />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Homepage Sections */}
      <div className="flex flex-col gap-12 pt-12 pb-12">
        {/* Live Now */}
        <section className="mx-auto w-full max-w-site px-4 sm:px-6">
          <div className="mb-4 flex items-end justify-between gap-4">
            <SkeletonTextBlock titleWidth={150} titleHeight={22} subtitleWidth={120} />
            <Skeleton width={68} height={14} />
          </div>
          <MatchCardGridSkeleton count={3} />
        </section>

        {/* Upcoming Matches */}
        <section className="mx-auto w-full max-w-site px-4 sm:px-6">
          <div className="mb-4 flex items-end justify-between gap-4">
            <SkeletonTextBlock titleWidth={190} titleHeight={22} subtitleWidth={210} />
            <Skeleton width={68} height={14} />
          </div>
          <MatchCardGridSkeleton count={3} />
        </section>

        {/* PSL Spotlight + Points Table */}
        <section className="mx-auto w-full max-w-site space-y-4 px-4 sm:px-6">
          <Card className="overflow-hidden rounded-2xl">
            <Skeleton height={220} className="!block !rounded-none" />
            <div className="flex flex-col gap-3 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1 space-y-2.5">
                <div className="flex flex-wrap gap-4">
                  <Skeleton width={120} height={12} />
                  <Skeleton width={72} height={12} />
                  <Skeleton width={80} height={12} />
                </div>
                <Skeleton width="75%" height={13} />
              </div>
              <Skeleton width={136} height={34} borderRadius={8} />
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8">
            <Card className="overflow-hidden rounded-2xl">
              <div className="flex items-center justify-between border-b border-lborder px-4 py-3 sm:px-5">
                <Skeleton width={110} height={15} />
                <Skeleton width={68} height={12} />
              </div>
              <div className="divide-y divide-lborder px-4 sm:px-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <Skeleton width={16} height={12} />
                      <Skeleton circle width={26} height={26} />
                      <Skeleton width="42%" height={13} />
                    </div>
                    <div className="flex shrink-0 gap-4">
                      <Skeleton width={22} height={12} />
                      <Skeleton width={22} height={12} />
                      <Skeleton width={38} height={12} />
                      <Skeleton width={26} height={12} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="hidden p-4 lg:block">
              <Skeleton height={250} />
            </Card>
          </div>
        </section>

        {/* Recent Results */}
        <section className="mx-auto w-full max-w-site px-4 sm:px-6">
          <div className="mb-4 flex items-end justify-between gap-4">
            <SkeletonTextBlock titleWidth={165} titleHeight={22} subtitleWidth={150} />
            <Skeleton width={68} height={14} />
          </div>
          <MatchCardGridSkeleton count={3} />
        </section>

        {/* Latest News (1 featured + 4 side cards matching lg:h-[448px]) */}
        <section className="mx-auto w-full max-w-site px-4 sm:px-6">
          <div className="mb-4 flex items-end justify-between gap-4">
            <SkeletonTextBlock titleWidth={145} titleHeight={22} subtitleWidth={215} />
            <Skeleton width={74} height={14} />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch">
            <Card className="flex flex-col overflow-hidden lg:h-[448px]">
              <div className="aspect-[16/9] w-full shrink-0 lg:aspect-auto lg:h-0 lg:min-h-0 lg:flex-1">
                <Skeleton height="100%" className="!block !rounded-none" />
              </div>
              <div className="shrink-0 space-y-2.5 p-4 sm:p-5">
                <Skeleton width="88%" height={18} />
                <Skeleton width="96%" height={12} />
                <Skeleton width="66%" height={12} />
                <Skeleton width={130} height={11} className="mt-1" />
              </div>
            </Card>
            <div className="grid grid-cols-1 gap-2.5 lg:h-[448px] lg:grid-rows-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="flex h-full items-center gap-3 p-2.5 sm:gap-4 sm:p-3">
                  <Skeleton width={96} height={76} borderRadius={8} containerClassName="shrink-0" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton width={68} height={15} borderRadius={999} />
                    <Skeleton width="92%" height={13} />
                    <Skeleton width={110} height={10} />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Newsletter */}
        <section className="mx-auto w-full max-w-site px-4 sm:px-6">
          <Card className="p-6 sm:p-8">
            <div className="mx-auto flex max-w-xl flex-col items-center space-y-3 text-center">
              <Skeleton width={210} height={22} />
              <Skeleton width="82%" height={13} />
              <div className="flex w-full max-w-md gap-2 pt-2">
                <Skeleton height={42} containerClassName="flex-1" borderRadius={8} />
                <Skeleton width={116} height={42} borderRadius={8} containerClassName="shrink-0" />
              </div>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}

export function MatchesPageSkeleton() {
  return (
    <Page className="space-y-5 py-6">
      <PageHeaderSkeleton />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-lborder pb-3">
        <div className="flex gap-2">
          <Skeleton width={84} height={28} borderRadius={999} />
          <Skeleton width={64} height={28} borderRadius={999} />
          <Skeleton width={92} height={28} borderRadius={999} />
        </div>
        <Skeleton width={220} height={36} />
      </div>
      <MatchCardGridSkeleton />
    </Page>
  );
}

export function GalleryPageSkeleton() {
  return (
    <Page className="space-y-7">
      <Card className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl flex-1">
          <Skeleton width={110} height={20} borderRadius={999} />
          <Skeleton width={180} height={34} className="mt-3" />
          <Skeleton width="70%" height={12} className="mt-3" />
        </div>
        <div className="grid grid-cols-4 gap-px overflow-hidden rounded-2xl lg:w-[420px]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[var(--color-skeleton)] px-2 py-3 text-center">
              <Skeleton width="70%" height={8} className="mx-auto" />
              <Skeleton width={28} height={20} className="mx-auto mt-1.5" />
            </div>
          ))}
        </div>
      </Card>
      <div className="flex gap-4 border-b border-lborder pb-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} width={96} height={18} />
        ))}
      </div>
      <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} height={i % 3 === 0 ? 210 : 150} borderRadius={4} className="!block" />
        ))}
      </div>
    </Page>
  );
}

/** Matches the Cric Stories listing: a portrait 9:16 grid under a text header. */
export function StoriesPageSkeleton() {
  return (
    <Page className="space-y-8">
      <div>
        <Skeleton width={64} height={14} />
        <Skeleton width={200} height={30} className="mt-2" />
        <Skeleton width="60%" height={12} className="mt-2" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} height={i % 2 === 0 ? 300 : 260} borderRadius={8} className="!block" />
        ))}
      </div>
    </Page>
  );
}

export function NewsPageSkeleton() {
  return (
    <Page>
      <PageHeaderSkeleton />
      <Card className="mb-10 overflow-hidden">
        <div className="grid md:grid-cols-[minmax(0,1.45fr)_minmax(280px,1fr)]">
          <Skeleton height={280} className="!block !rounded-none md:!h-full md:min-h-[360px]" />
          <div className="p-5 sm:p-7">
            <Skeleton width={88} height={22} />
            <Skeleton width="90%" height={28} className="mt-5" />
            <Skeleton count={3} className="mt-3" />
          </div>
        </div>
      </Card>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <NewsCardSkeleton key={i} />
        ))}
      </div>
    </Page>
  );
}

export function NewsDetailSkeleton() {
  return (
    <Page>
      <Skeleton width={220} height={10} className="mb-6" />
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Skeleton width={80} height={18} borderRadius={999} />
          <Skeleton width="92%" height={36} className="mt-4" />
          <Skeleton count={2} className="mt-4" />
          <Skeleton height={224} className="mt-8 sm:!h-80" />
          <Skeleton count={6} className="mt-10" />
        </div>
        <aside className="space-y-4">
          <Skeleton height={250} />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton width={80} height={64} />
              <div className="flex-1">
                <Skeleton count={2} />
              </div>
            </div>
          ))}
        </aside>
      </div>
    </Page>
  );
}

export function PslPageSkeleton() {
  return (
    <div className="min-h-screen" aria-busy="true" aria-label="Loading">
      <div className="relative h-72">
        <Skeleton height="100%" className="!block !rounded-none" />
      </div>
      <Page className="space-y-10">
        <div className="flex flex-wrap gap-2">
          <Skeleton width={160} height={32} borderRadius={999} />
          <Skeleton width={160} height={32} borderRadius={999} />
          <Skeleton width={160} height={32} borderRadius={999} />
        </div>
        <div>
          <Skeleton width={140} height={22} />
          <Card className="mt-4 overflow-hidden p-0">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b border-lborder px-4 py-3 last:border-0">
                <Skeleton width={20} height={12} />
                <Skeleton circle width={28} height={28} />
                <Skeleton width="30%" height={12} />
                <Skeleton width={28} height={12} containerClassName="ml-auto" />
              </div>
            ))}
          </Card>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-6 text-center">
              <Skeleton circle width={56} height={56} containerClassName="flex justify-center" />
              <Skeleton width="70%" height={14} className="mx-auto mt-4" />
            </Card>
          ))}
        </div>
      </Page>
    </div>
  );
}

export function DirectoryPageSkeleton() {
  return (
    <Page className="space-y-8">
      <Card className="p-6 sm:p-8">
        <Skeleton width={140} height={18} borderRadius={999} />
        <Skeleton width={280} height={32} className="mt-3" />
        <Skeleton width="50%" height={12} className="mt-2" />
      </Card>
      <Skeleton width="100%" height={40} />
      <DirectoryGridSkeleton />
    </Page>
  );
}

export function ToursPageSkeleton() {
  return (
    <Page className="space-y-5">
      <Card className="p-5 sm:p-6">
        <Skeleton width={180} height={12} />
        <Skeleton width={260} height={26} className="mt-2" />
        <Skeleton width="45%" height={12} className="mt-2" />
      </Card>
      <div className="flex flex-wrap gap-2">
        <Skeleton width={72} height={30} />
        <Skeleton width={96} height={30} />
        <Skeleton width={88} height={30} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton width="70%" height={16} />
            <Skeleton width="40%" height={10} className="mt-3" />
            <Skeleton width="55%" height={10} className="mt-2" />
          </Card>
        ))}
      </div>
    </Page>
  );
}

export function SearchResultsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Skeleton width={72} height={28} borderRadius={999} />
        <Skeleton width={88} height={28} borderRadius={999} />
        <Skeleton width={80} height={28} borderRadius={999} />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="flex items-center gap-3 p-3">
          <Skeleton circle width={40} height={40} />
          <div className="flex-1">
            <Skeleton width="50%" height={12} />
            <Skeleton width="30%" height={10} className="mt-2" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function StreamsBodySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Skeleton height={256} />
        <Card className="mt-4 p-5">
          <Skeleton width="55%" height={18} />
          <Skeleton count={2} className="mt-3" />
        </Card>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-3">
            <Skeleton height={72} />
          </Card>
        ))}
      </div>
    </div>
  );
}

export function SearchPageSkeleton() {
  return (
    <Page>
      <PageHeaderSkeleton />
      <Skeleton height={48} />
      <div className="mt-6 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="flex items-center gap-3 p-3">
            <Skeleton circle width={40} height={40} />
            <div className="flex-1">
              <Skeleton width="50%" height={12} />
              <Skeleton width="30%" height={10} className="mt-2" />
            </div>
          </Card>
        ))}
      </div>
    </Page>
  );
}

export function ProfilePageSkeleton() {
  return (
    <Page>
      <div className="mb-6 flex justify-between">
        <div>
          <Skeleton width={220} height={28} />
          <Skeleton width={280} height={12} className="mt-2" />
        </div>
        <Skeleton width={120} height={36} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <Card className="p-5">
          <Skeleton circle width={72} height={72} />
          <Skeleton width="80%" height={14} className="mt-4" />
          <Skeleton width="60%" height={10} className="mt-2" />
        </Card>
        <Card className="space-y-4 p-5">
          <Skeleton height={40} />
          <Skeleton height={40} />
          <Skeleton height={40} />
        </Card>
      </div>
    </Page>
  );
}

export function FavoritesPageSkeleton() {
  return (
    <Page>
      <Card className="mb-8 overflow-hidden p-6 sm:p-8">
        <Skeleton width={100} height={10} />
        <Skeleton width={160} height={32} className="mt-2" />
        <div className="mt-5 flex flex-wrap gap-2">
          <Skeleton width={90} height={28} borderRadius={4} />
          <Skeleton width={75} height={28} borderRadius={4} />
          <Skeleton width={80} height={28} borderRadius={4} />
        </div>
        <div className="mt-4 flex gap-1.5 border-t border-lborder/50 pt-3">
          <Skeleton width={50} height={28} borderRadius={4} />
          <Skeleton width={60} height={28} borderRadius={4} />
          <Skeleton width={55} height={28} borderRadius={4} />
        </div>
      </Card>
      {Array.from({ length: 2 }).map((_, s) => (
        <div key={s} className="mb-8">
          <div className="mb-4 flex items-center gap-2.5">
            <Skeleton width={32} height={32} borderRadius={4} />
            <Skeleton width={80} height={18} />
            <Skeleton width={24} height={20} borderRadius={4} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton width={56} height={56} borderRadius={4} />
                  <div className="flex-1">
                    <Skeleton width="70%" height={14} />
                    <Skeleton width="50%" height={10} className="mt-2" />
                  </div>
                </div>
                <Skeleton height={1} className="mt-3" />
                <Skeleton width="40%" height={10} className="mt-3" />
              </Card>
            ))}
          </div>
        </div>
      ))}
    </Page>
  );
}

export function MatchDetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-4 px-4 pb-10 pt-4 sm:px-6 sm:pt-5">
      <Skeleton width="100%" height={90} borderRadius={8} />
      <div>
        <Skeleton width={180} height={12} />
        <Skeleton width={420} height={28} className="mt-2" containerClassName="block max-w-full" />
        <Skeleton width={300} height={10} className="mt-2" />
      </div>
      <div className="rounded-md border border-lborder bg-card p-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-3">
            <Skeleton circle width={52} height={52} containerClassName="shrink-0" />
            <div className="min-w-0 flex-1">
              <Skeleton width="70%" height={12} />
              <Skeleton width={92} height={28} className="mt-1.5" />
              <Skeleton width={48} height={9} className="mt-1.5" />
            </div>
          </div>
          <Skeleton circle width={32} height={32} />
          <div className="flex flex-row-reverse items-center gap-3">
            <Skeleton circle width={52} height={52} containerClassName="shrink-0" />
            <div className="min-w-0 flex-1">
              <Skeleton width="70%" height={12} containerClassName="flex justify-end" />
              <Skeleton width={92} height={28} className="mt-1.5" containerClassName="flex justify-end" />
              <Skeleton width={48} height={9} className="mt-1.5" containerClassName="flex justify-end" />
            </div>
          </div>
        </div>
        <Skeleton height={30} borderRadius={6} className="mt-4" />
      </div>
      <div className="flex gap-1 overflow-hidden">
        {[88, 96, 112, 80, 72, 88, 60, 92].map((w, i) => (
          <Skeleton key={i} width={w} height={34} borderRadius={6} containerClassName="shrink-0" />
        ))}
      </div>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
        <div className="min-w-0 space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-md border border-lborder bg-card">
              <div className="flex items-center gap-2 border-b border-lborder px-4 py-2.5">
                <Skeleton circle width={20} height={20} containerClassName="shrink-0" />
                <Skeleton width={140} height={12} />
              </div>
              <div className="space-y-2.5 p-4">
                <Skeleton height={12} />
                <Skeleton width="92%" height={12} />
                <Skeleton width="78%" height={12} />
              </div>
            </div>
          ))}
        </div>
        <div className="min-w-0 space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-md border border-lborder bg-card">
              <div className="border-b border-lborder px-3 py-2.5">
                <Skeleton width={110} height={12} />
              </div>
              <div className="space-y-2 p-3">
                <Skeleton height={38} />
                <Skeleton height={38} />
                <Skeleton height={38} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-md border border-lborder bg-card p-4">
        <Skeleton width={120} height={16} />
        <CommentListSkeleton count={2} />
      </div>
    </div>
  );
}

export function TeamDetailSkeleton() {
  return (
    <Page className="space-y-5">
      <Skeleton width={120} height={10} />
      <EntityProfileHeaderSkeleton />
      <div className="inline-flex flex-wrap gap-1 rounded-md bg-secondary p-1 ring-1 ring-lborder">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} width={88} height={32} borderRadius={4} />
        ))}
      </div>
      <MatchCardGridSkeleton count={6} />
    </Page>
  );
}

export function PlayerDetailSkeleton() {
  return (
    <Page className="space-y-5">
      <Skeleton width={160} height={10} />
      <EntityProfileHeaderSkeleton />
      <div className="inline-flex flex-wrap gap-1 rounded-md bg-secondary p-1 ring-1 ring-lborder">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} width={72} height={32} borderRadius={4} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="space-y-2 p-4">
            <Skeleton width="50%" height={10} />
            <Skeleton width="70%" height={22} />
          </Card>
        ))}
      </div>
      <div>
        <Skeleton width={180} height={18} className="mb-3" />
        <MatchCardGridSkeleton count={4} dense columns="four" />
      </div>
    </Page>
  );
}

export function StreamsPageSkeleton() {
  return (
    <Page className="space-y-5">
      <PageHeaderSkeleton />
      <div className="flex gap-2">
        <Skeleton width={64} height={28} />
        <Skeleton width={72} height={28} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Skeleton height={280} />
          <Card className="mt-4 p-5">
            <Skeleton width="60%" height={18} />
            <Skeleton count={2} className="mt-3" />
          </Card>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-3">
              <Skeleton height={72} />
            </Card>
          ))}
        </div>
      </div>
    </Page>
  );
}

export function StatsPageSkeleton() {
  return (
    <Page>
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="p-5">
            <Skeleton width={140} height={16} />
            {Array.from({ length: 5 }).map((_, r) => (
              <div key={r} className="mt-3 flex items-center gap-3">
                <Skeleton width={16} height={12} />
                <Skeleton circle width={28} height={28} />
                <Skeleton width="50%" height={12} />
              </div>
            ))}
          </Card>
        ))}
      </div>
    </Page>
  );
}

export function AuthorDetailSkeleton() {
  return (
    <Page className="space-y-6">
      <Skeleton width={140} height={10} />
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Skeleton circle width={80} height={80} />
          <div className="flex-1">
            <Skeleton width={72} height={20} />
            <Skeleton width={180} height={26} className="mt-2" />
            <Skeleton width="40%" height={12} className="mt-2" />
          </div>
          <Skeleton width={120} height={64} />
        </div>
      </Card>
      <div className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton height={140} />
            <div className="p-3.5">
              <Skeleton width="90%" height={14} />
              <Skeleton width="40%" height={10} className="mt-3" />
            </div>
          </Card>
        ))}
      </div>
    </Page>
  );
}

export function AuthorsPageSkeleton() {
  return (
    <Page>
      <PageHeaderSkeleton />
      <div className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="flex h-full items-center gap-3 p-3.5">
            <Skeleton circle width={48} height={48} />
            <div className="flex-1">
              <Skeleton width="55%" height={14} />
              <Skeleton width="35%" height={10} className="mt-2" />
              <Skeleton width="70%" height={10} className="mt-2" />
            </div>
          </Card>
        ))}
      </div>
    </Page>
  );
}

export function ArticlePageSkeleton() {
  return (
    <Page className="max-w-3xl">
      <Skeleton width={220} height={32} />
      <Skeleton count={8} className="mt-6" />
    </Page>
  );
}

export function AuthPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-site px-4 py-6 sm:px-6 sm:py-10" aria-busy="true" aria-label="Loading">
      <Card className="grid overflow-hidden lg:grid-cols-2">
        <Skeleton height={280} className="!block !rounded-none lg:!h-full lg:min-h-[640px]" />
        <div className="space-y-4 p-6 sm:p-10">
          <Skeleton width={200} height={28} />
          <Skeleton width="80%" height={12} />
          <Skeleton height={40} className="mt-6" />
          <Skeleton height={40} />
          <Skeleton height={40} />
          <Skeleton height={44} />
        </div>
      </Card>
    </div>
  );
}

function CricketBallSpinner({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className="animate-spin"
      style={{ animationDuration: '1.15s' }}
    >
      <circle
        cx="16"
        cy="16"
        r="13.5"
        stroke="var(--admin-accent)"
        strokeWidth="2.2"
        fill="var(--admin-info-bg, transparent)"
      />
      {/* Cricket ball stitched seam */}
      <path
        d="M8.2 6.8C12.8 11.4 12.8 20.6 8.2 25.2"
        stroke="var(--admin-accent)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeDasharray="2.2 2.4"
      />
      <path
        d="M23.8 6.8C19.2 11.4 19.2 20.6 23.8 25.2"
        stroke="var(--admin-accent)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeDasharray="2.2 2.4"
      />
    </svg>
  );
}

export function AdminLoader({ fullPage = false }: { fullPage?: boolean }) {
  return (
    <div
      className={`grid place-items-center ${fullPage ? 'min-h-screen' : 'min-h-[16rem]'}`}
      style={fullPage ? { background: 'var(--admin-bg)' } : undefined}
      aria-busy="true"
      aria-label="Loading"
    >
      <CricketBallSpinner size={fullPage ? 34 : 28} />
    </div>
  );
}

export type AdminLoadingVariant =
  | 'dashboard'
  | 'table'
  | 'people'
  | 'news'
  | 'gallery'
  | 'editor'
  | 'form'
  | 'editorial'
  | 'categories';

const VARIANT_LABEL: Record<AdminLoadingVariant, string> = {
  dashboard: 'Loading dashboard…',
  table: 'Loading records…',
  people: 'Loading directory…',
  news: 'Loading articles…',
  gallery: 'Loading media…',
  editor: 'Preparing editor…',
  form: 'Loading settings…',
  editorial: 'Loading page…',
  categories: 'Loading categories…',
};

function AdminShimmerBar({
  w = '100%',
  h = 12,
  rounded = 'rounded',
}: {
  w?: string | number;
  h?: number;
  rounded?: string;
}) {
  return (
    <span
      className={`block animate-pulse ${rounded}`}
      style={{
        width: typeof w === 'number' ? `${w}px` : w,
        height: `${h}px`,
        background: 'var(--admin-input-bg, var(--color-lborder))',
      }}
    />
  );
}

export function AdminRouteSkeleton({
  variant = 'table',
  text,
}: {
  variant?: AdminLoadingVariant;
  text?: string;
}) {
  const label = text || VARIANT_LABEL[variant] || 'Loading…';

  if (variant === 'dashboard') {
    return (
      <div className="space-y-5" aria-busy="true" aria-label={label}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="space-y-3 rounded-lg p-4"
              style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
            >
              <div className="flex items-center justify-between">
                <AdminShimmerBar w="52%" h={10} />
                <AdminShimmerBar w={28} h={28} rounded="rounded-md" />
              </div>
              <AdminShimmerBar w="40%" h={24} />
              <AdminShimmerBar w="68%" h={10} />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="space-y-3 rounded-lg p-4"
              style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
            >
              <AdminShimmerBar w="36%" h={13} />
              {Array.from({ length: 4 }).map((__, r) => (
                <div key={r} className="flex items-center justify-between gap-3 py-1.5">
                  <AdminShimmerBar w="62%" h={11} />
                  <AdminShimmerBar w={52} h={11} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'gallery') {
    return (
      <div className="space-y-4" aria-busy="true" aria-label={label}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-lg"
              style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
            >
              <div
                className="aspect-[4/3] w-full animate-pulse"
                style={{ background: 'var(--admin-input-bg, var(--color-lborder))' }}
              />
              <div className="space-y-2 p-3">
                <AdminShimmerBar w="75%" h={11} />
                <AdminShimmerBar w="45%" h={9} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'editor' || variant === 'form' || variant === 'editorial') {
    return (
      <div
        className="space-y-4 rounded-lg p-5"
        style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
        aria-busy="true"
        aria-label={label}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <AdminShimmerBar w="30%" h={10} />
            <AdminShimmerBar w="100%" h={36} rounded="rounded-md" />
          </div>
          <div className="space-y-2">
            <AdminShimmerBar w="34%" h={10} />
            <AdminShimmerBar w="100%" h={36} rounded="rounded-md" />
          </div>
        </div>
        <div className="space-y-2">
          <AdminShimmerBar w="24%" h={10} />
          <AdminShimmerBar w="100%" h={140} rounded="rounded-md" />
        </div>
      </div>
    );
  }

  const showThumb = variant === 'news';
  const showAvatar = variant === 'people';

  return (
    <div
      className="overflow-hidden rounded-lg"
      style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
      aria-busy="true"
      aria-label={label}
    >
      <div
        className="flex items-center justify-between gap-4 px-4 py-3"
        style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-table-header)' }}
      >
        <AdminShimmerBar w="28%" h={11} />
        <AdminShimmerBar w={84} h={10} rounded="rounded-full" />
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--admin-border)' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {showThumb ? (
                <AdminShimmerBar w={48} h={34} rounded="rounded" />
              ) : showAvatar ? (
                <AdminShimmerBar w={30} h={30} rounded="rounded-full" />
              ) : null}
              <div className="min-w-0 flex-1 space-y-2">
                <AdminShimmerBar w={`${58 + (i % 3) * 12}%`} h={12} />
                <AdminShimmerBar w={`${32 + (i % 2) * 14}%`} h={9} />
              </div>
            </div>
            <AdminShimmerBar w={72} h={20} rounded="rounded-full" />
            <AdminShimmerBar w={64} h={11} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PredictionMatchCardSkeleton() {
  return (
    <div className="prediction-card flex h-full flex-col rounded-xl border border-lborder/80 bg-card p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Skeleton width="42%" height={10} />
        <Skeleton width={64} height={18} borderRadius={999} />
      </div>
      <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <Skeleton circle width={36} height={36} />
          <Skeleton width="70%" height={12} />
        </div>
        <Skeleton width={16} height={8} />
        <div className="flex min-w-0 items-center justify-end gap-2.5">
          <Skeleton width="70%" height={12} />
          <Skeleton circle width={36} height={36} />
        </div>
      </div>
      <Skeleton width="55%" height={22} />
      <Skeleton width="40%" height={10} className="mt-1.5" />
      <Skeleton height={10} className="mt-5" />
      <div className="mt-5 grid grid-cols-3 justify-items-center gap-4">
        <div className="text-center">
          <Skeleton circle width={56} height={56} />
          <Skeleton width={56} height={8} className="mt-1.5" />
        </div>
        <div className="text-center">
          <Skeleton circle width={56} height={56} />
          <Skeleton width={52} height={8} className="mt-1.5" />
        </div>
        <div className="text-center">
          <Skeleton circle width={56} height={56} />
          <Skeleton width={60} height={8} className="mt-1.5" />
        </div>
      </div>
      <div className="mt-4 rounded-lg bg-surface-muted px-3 py-2.5">
        <Skeleton height={10} />
        <Skeleton width="80%" height={10} className="mt-1.5" />
      </div>
      <div className="mt-auto grid grid-cols-2 gap-x-5 gap-y-3 border-t border-lborder/80 pt-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="min-w-0">
            <Skeleton width={48} height={8} />
            <Skeleton width="85%" height={11} className="mt-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PredictionsHubSkeleton() {
  return (
    <Page className="space-y-6">
      <header>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Skeleton width={220} height={36} />
            <Skeleton width={280} height={14} className="mt-3" />
          </div>
          <Skeleton width={72} height={12} />
        </div>
      </header>
      <div className="flex flex-wrap items-center gap-2 border-b border-lborder pb-3">
        <Skeleton width={88} height={32} />
        <Skeleton width={112} height={32} />
      </div>
      <div className="grid items-stretch gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,20rem),1fr))]">
        {Array.from({ length: 6 }).map((_, i) => (
          <PredictionMatchCardSkeleton key={i} />
        ))}
      </div>
    </Page>
  );
}

export function PredictionsDetailSkeleton() {
  return (
    <Page className="space-y-5">
      <Skeleton width={220} height={12} />
      <div className="overflow-hidden rounded-md border border-lborder bg-card">
        <div className="flex items-center justify-between gap-2 border-b border-lborder bg-secondary px-4 py-2.5 sm:px-6">
          <Skeleton width="55%" height={10} />
          <Skeleton width={72} height={18} borderRadius={999} />
        </div>
        <div className="p-5 sm:p-6">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-3">
              <Skeleton circle width={56} height={56} />
              <div className="min-w-0 flex-1">
                <Skeleton width="70%" height={14} />
                <Skeleton width={64} height={22} className="mt-2" />
              </div>
            </div>
            <Skeleton width={20} height={10} />
            <div className="flex items-center justify-end gap-3">
              <div className="min-w-0 flex-1 text-right">
                <Skeleton width="70%" height={14} containerClassName="flex justify-end" />
                <Skeleton width={64} height={22} className="mt-2" containerClassName="flex justify-end" />
              </div>
              <Skeleton circle width={56} height={56} />
            </div>
          </div>
          <Skeleton height={10} className="mt-5" />
          <div className="mt-5 rounded-md border border-lborder bg-secondary px-4 py-3">
            <Skeleton width="40%" height={24} containerClassName="flex justify-center" />
            <Skeleton width="55%" height={12} className="mt-2" containerClassName="flex justify-center" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-md border border-lborder p-3">
              <Skeleton width={72} height={10} />
              <Skeleton height={16} className="mt-2" />
            </div>
            <div className="rounded-md border border-lborder p-3">
              <Skeleton width={48} height={10} />
              <Skeleton height={16} className="mt-2" />
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <Card className="p-5">
            <Skeleton width={140} height={14} />
            <Skeleton height={220} className="mt-4" />
          </Card>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Card className="p-5">
              <Skeleton width={100} height={14} />
              <Skeleton height={14} className="mt-4" />
              <Skeleton height={14} className="mt-2" />
              <Skeleton height={14} className="mt-2" />
            </Card>
            <Card className="p-5">
              <Skeleton width={88} height={14} />
              <Skeleton height={14} className="mt-4" />
              <Skeleton height={14} className="mt-2" />
              <Skeleton height={14} className="mt-2" />
            </Card>
          </div>
        </div>
        <Card className="p-5">
          <Skeleton width={96} height={14} />
          <Skeleton height={72} className="mt-4" />
          <Skeleton height={72} className="mt-3" />
        </Card>
      </div>
    </Page>
  );
}

export function AdminLoadingBody(_props: { variant?: AdminLoadingVariant }) {
  return <AdminLoader />;
}

export function AdminPageSkeleton() {
  return <AdminLoader />;
}

export function AdminTableSkeleton() {
  return <AdminRouteSkeleton variant="table" />;
}

export function AdminChromeSkeleton() {
  return <AdminLoader fullPage />;
}

export function EditorSkeleton() {
  return <AdminRouteSkeleton variant="editor" />;
}
