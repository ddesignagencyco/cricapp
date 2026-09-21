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
  const boneStyle = {
    width: toCssSize(width) ?? '100%',
    height: toCssSize(height),
    borderRadius: radius,
    lineHeight: 1,
    '--base-color': tone.baseColor || 'var(--color-skeleton)',
    '--highlight-color': tone.highlightColor || 'var(--color-skeleton-highlight)',
    backgroundColor: tone.baseColor || 'var(--color-skeleton)',
    ...style,
  } as CSSProperties;

  return (
    <span className={containerClassName} aria-live="polite" aria-busy="true">
      {Array.from({ length: Math.max(1, count) }, (_, index) => (
        <span key={index} className={`react-loading-skeleton ${className}`.trim()} style={boneStyle}>
          {'\u200c'}
        </span>
      ))}
    </span>
  );
}

export function AppSkeletonTheme({ children }: { children: ReactNode; theme?: string }) {
  return children;
}

function Page({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mx-auto max-w-7xl px-4 py-8 sm:px-6 ${className}`} aria-busy="true" aria-label="Loading">
      {children}
    </div>
  );
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-md border border-lborder bg-card ${className}`}>{children}</div>;
}

export function MatchCardSkeleton() {
  return (
    <Card className="p-3.5">
      <div className="mb-2.5 flex items-center justify-between">
        <Skeleton width="55%" height={10} />
        <Skeleton width={72} height={18} borderRadius={999} />
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2.5">
          <Skeleton circle width={28} height={28} />
          <Skeleton width="50%" height={12} />
          <Skeleton width={40} height={12} containerClassName="ml-auto" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton circle width={28} height={28} />
          <Skeleton width="45%" height={12} />
          <Skeleton width={40} height={12} containerClassName="ml-auto" />
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between border-t border-lborder pt-2">
        <Skeleton width={88} height={10} />
        <Skeleton width={56} height={12} />
      </div>
    </Card>
  );
}

export function MatchCardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <MatchCardSkeleton key={i} />
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

export function PageHeaderSkeleton() {
  return (
    <header className="mb-6">
      <Skeleton width={96} height={10} />
      <Skeleton width={260} height={28} className="mt-2" />
      <Skeleton width="55%" height={12} className="mt-2" />
    </header>
  );
}

export function HomeSkeleton() {
  return (
    <div className="min-h-screen" aria-busy="true" aria-label="Loading">
      <div className="border-b border-lborder bg-card px-4 py-2.5">
        <div className="mx-auto flex max-w-7xl gap-3 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} width={180} height={28} />
          ))}
        </div>
      </div>
      <div className="relative h-64 sm:h-80">
        <Skeleton height="100%" className="!block !rounded-none" />
      </div>
      <Page className="space-y-10">
        <div>
          <Skeleton width={160} height={22} />
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <MatchCardSkeleton />
            <MatchCardSkeleton />
            <MatchCardSkeleton />
          </div>
        </div>
        <div>
          <Skeleton width={200} height={22} />
          <div className="mt-4 grid grid-cols-1 gap-2.5 lg:grid-cols-2">
            <Card className="p-3.5"><Skeleton height={56} /></Card>
            <Card className="p-3.5"><Skeleton height={56} /></Card>
          </div>
        </div>
        <Card className="p-5">
          <Skeleton width={140} height={18} />
          <Skeleton height={180} className="mt-4" />
        </Card>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="overflow-hidden">
            <Skeleton height={220} className="!block !rounded-none" />
            <div className="p-5">
              <Skeleton width="80%" height={18} />
              <Skeleton count={2} className="mt-3" />
            </div>
          </Card>
          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="flex gap-3 p-3">
                <Skeleton width={80} height={64} />
                <div className="min-w-0 flex-1">
                  <Skeleton width={64} height={14} borderRadius={999} />
                  <Skeleton width="90%" height={12} className="mt-2" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Page>
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
          <Skeleton key={i} height={i % 3 === 0 ? 210 : 150} borderRadius={16} className="!block" />
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
          <Skeleton width={90} height={28} borderRadius={8} />
          <Skeleton width={75} height={28} borderRadius={8} />
          <Skeleton width={80} height={28} borderRadius={8} />
        </div>
        <div className="mt-4 flex gap-1.5 border-t border-lborder/50 pt-3">
          <Skeleton width={50} height={28} borderRadius={8} />
          <Skeleton width={60} height={28} borderRadius={8} />
          <Skeleton width={55} height={28} borderRadius={8} />
        </div>
      </Card>
      {Array.from({ length: 2 }).map((_, s) => (
        <div key={s} className="mb-8">
          <div className="mb-4 flex items-center gap-2.5">
            <Skeleton width={32} height={32} borderRadius={8} />
            <Skeleton width={80} height={18} />
            <Skeleton width={24} height={20} borderRadius={6} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton width={56} height={56} borderRadius={12} />
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
    <Page className="space-y-5">
      <Card className="p-5">
        <Skeleton width={180} height={10} />
        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="flex flex-1 flex-col items-center gap-2">
            <Skeleton circle width={48} height={48} />
            <Skeleton width={90} height={12} />
          </div>
          <Skeleton width={72} height={28} />
          <div className="flex flex-1 flex-col items-center gap-2">
            <Skeleton circle width={48} height={48} />
            <Skeleton width={90} height={12} />
          </div>
        </div>
      </Card>
      <div className="flex gap-2">
        <Skeleton width={88} height={32} />
        <Skeleton width={88} height={32} />
        <Skeleton width={88} height={32} />
      </div>
      <Card className="p-5">
        <Skeleton count={8} />
      </Card>
      <Card className="p-5">
        <Skeleton width={120} height={16} />
        <CommentListSkeleton count={2} />
      </Card>
    </Page>
  );
}

export function TeamDetailSkeleton() {
  return (
    <Page className="space-y-5">
      <Card className="p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <Skeleton circle width={72} height={72} />
          <div className="flex-1">
            <Skeleton width={200} height={24} />
            <Skeleton width={120} height={12} className="mt-2" />
          </div>
        </div>
      </Card>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} width={80} height={28} />
        ))}
      </div>
      <DirectoryGridSkeleton count={6} />
    </Page>
  );
}

export function PlayerDetailSkeleton() {
  return (
    <Page className="space-y-5">
      <Skeleton width={160} height={10} />
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <Skeleton circle width={96} height={96} />
          <div className="flex-1">
            <Skeleton width={220} height={28} />
            <Skeleton width={140} height={12} className="mt-2" />
          </div>
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton width="50%" height={10} />
            <Skeleton width="70%" height={22} className="mt-2" />
          </Card>
        ))}
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
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10" aria-busy="true" aria-label="Loading">
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

export function AdminLoader({ fullPage = false }: { fullPage?: boolean }) {
  return (
    <div
      className={`grid place-items-center ${fullPage ? 'min-h-screen' : 'min-h-[18rem]'}`}
      style={fullPage ? { background: 'var(--admin-bg)' } : undefined}
      aria-busy="true"
      aria-label="Loading"
    >
      <Loader2
        size={fullPage ? 28 : 24}
        className="animate-spin"
        style={{ color: 'var(--admin-accent)' }}
        aria-hidden
      />
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

export function AdminRouteSkeleton(_props: { variant?: AdminLoadingVariant }) {
  return <AdminLoader />;
}

export function AdminLoadingBody(_props: { variant?: AdminLoadingVariant }) {
  return <AdminLoader />;
}

export function AdminPageSkeleton() {
  return <AdminLoader />;
}

export function AdminTableSkeleton() {
  return <AdminLoader />;
}

export function AdminChromeSkeleton() {
  return <AdminLoader fullPage />;
}

export function EditorSkeleton() {
  return <AdminLoader />;
}
