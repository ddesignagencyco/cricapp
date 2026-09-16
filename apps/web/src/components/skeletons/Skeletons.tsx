'use client';

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

function SkeletonTheme({
  children,
  baseColor,
  highlightColor,
}: {
  children: ReactNode;
  baseColor?: string;
  highlightColor?: string;
}) {
  return (
    <SkeletonToneContext.Provider value={{ baseColor, highlightColor }}>
      {children}
    </SkeletonToneContext.Provider>
  );
}

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

function AdminContentSkeletonTheme({ children }: { children: ReactNode }) {
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

export function CommentListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="rounded bg-elevated/60 p-3.5 ring-1 ring-lborder/60">
          <div className="flex items-center gap-2.5">
            <Skeleton circle width={28} height={28} />
            <div className="min-w-0 flex-1">
              <Skeleton width={120} height={10} />
              <Skeleton width={88} height={8} className="mt-1.5" />
            </div>
          </div>
          <Skeleton count={2} height={10} className="mt-3" />
          <div className="mt-3 flex gap-1.5">
            <Skeleton width={52} height={24} borderRadius={999} />
            <Skeleton width={52} height={24} borderRadius={999} />
            <Skeleton width={52} height={24} borderRadius={999} />
            <Skeleton width={52} height={24} borderRadius={999} />
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
      <Card className="mb-8 p-6 sm:p-8">
        <Skeleton width={120} height={10} />
        <Skeleton width={180} height={32} className="mt-2" />
        <div className="mt-6 flex flex-wrap gap-2">
          <Skeleton width={110} height={32} borderRadius={999} />
          <Skeleton width={80} height={32} borderRadius={999} />
          <Skeleton width={88} height={32} borderRadius={999} />
        </div>
      </Card>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton height={96} />
            <Skeleton width="70%" height={14} className="mt-3" />
          </Card>
        ))}
      </div>
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

function adminCardStyle(): CSSProperties {
  return { border: '1px solid var(--admin-border)', background: 'var(--admin-card)' };
}

function AdminTheadRow({ cols }: { cols: number }) {
  return (
    <SkeletonTheme
      baseColor="var(--color-skeleton-on-dark)"
      highlightColor="var(--color-skeleton-on-dark-highlight)"
    >
      <tr style={{ background: 'var(--admin-table-header)' }}>
        {Array.from({ length: cols }).map((_, i) => (
          <th key={i} className="px-4 py-3">
            <Skeleton width={i === 0 ? 72 : 56} height={10} />
          </th>
        ))}
      </tr>
    </SkeletonTheme>
  );
}

export function AdminTableSkeleton({
  rows = 8,
  cols = 5,
  withAvatar = false,
}: {
  rows?: number;
  cols?: number;
  withAvatar?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-lg" style={adminCardStyle()}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <AdminTheadRow cols={cols} />
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                {Array.from({ length: cols }).map((_, c) => (
                  <td key={c} className="px-4 py-3">
                    {withAvatar && c === 0 ? (
                      <div className="flex items-center gap-2.5">
                        <Skeleton circle width={28} height={28} />
                        <Skeleton width="58%" height={10} />
                      </div>
                    ) : (
                      <Skeleton width={c === 0 ? '70%' : c === cols - 1 ? 52 : '45%'} height={10} />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminNewsSkeleton() {
  return (
    <AdminTableSkeleton rows={8} cols={6} withAvatar />
  );
}

export function AdminGallerySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-lg" style={adminCardStyle()}>
          <Skeleton height={96} className="!block !rounded-none" />
          <div className="px-2 py-2">
            <Skeleton width="80%" height={8} />
            <Skeleton width="40%" height={8} className="mt-1.5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminFormSkeleton() {
  return (
    <div className="space-y-4 rounded-lg p-4" style={adminCardStyle()}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i}>
            <Skeleton width={88} height={10} />
            <Skeleton height={38} className="mt-2" />
          </div>
        ))}
      </div>
      <Skeleton width={120} height={14} className="mt-2" />
      <Skeleton height={38} />
      <Skeleton height={38} />
      <Skeleton width={120} height={36} />
    </div>
  );
}

export function AdminEditorialSkeleton() {
  return (
    <div className="space-y-3 rounded-lg p-4" style={adminCardStyle()}>
      <Skeleton width={64} height={10} />
      <Skeleton height={38} />
      <Skeleton width={72} height={10} className="mt-2" />
      <Skeleton height={280} />
      <Skeleton width={128} height={36} />
    </div>
  );
}

export function AdminCategoriesSkeleton() {
  return (
    <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[300px_1fr]">
      <div className="rounded-lg p-4" style={adminCardStyle()}>
        <Skeleton width={110} height={12} />
        <Skeleton height={38} className="mt-4" />
        <Skeleton height={32} className="mt-3" />
      </div>
      <AdminTableSkeleton rows={6} cols={5} />
    </div>
  );
}

export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton width={220} height={28} />
          <Skeleton width={260} height={12} className="mt-2" />
        </div>
        <div className="flex gap-2">
          <Skeleton width={108} height={32} />
          <Skeleton width={118} height={32} />
        </div>
      </div>
      <div className="grid grid-cols-2 items-start gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="rounded-lg p-4" style={adminCardStyle()}>
            <Skeleton width="50%" height={8} />
            <Skeleton width="40%" height={22} className="mt-2" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <AdminTableSkeleton rows={5} cols={5} withAvatar />
          <AdminTableSkeleton rows={5} cols={4} withAvatar />
        </div>
        <div className="space-y-5">
          <div className="rounded-lg p-4" style={adminCardStyle()}>
            <Skeleton width={120} height={12} />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="mt-3 flex gap-2.5">
                <Skeleton width={24} height={24} />
                <div className="min-w-0 flex-1">
                  <Skeleton width="90%" height={10} />
                  <Skeleton width="40%" height={8} className="mt-1.5" />
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-lg p-4" style={adminCardStyle()}>
            <Skeleton width={140} height={12} />
            <Skeleton width={48} height={28} className="mt-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminPageSkeleton() {
  return (
    <AdminContentSkeletonTheme>
      <AdminDashboardSkeleton />
    </AdminContentSkeletonTheme>
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

export function AdminRouteSkeleton({ variant }: { variant: AdminLoadingVariant }) {
  return (
    <AdminContentSkeletonTheme>
      <div className="space-y-5" aria-busy="true" aria-label="Loading">
        {variant === 'dashboard' ? (
          <AdminDashboardSkeleton />
        ) : (
          <>
            <div>
              <Skeleton width={168} height={28} />
              <Skeleton width={240} height={12} className="mt-2" />
            </div>
            <AdminLoadingBody variant={variant} />
          </>
        )}
      </div>
    </AdminContentSkeletonTheme>
  );
}

export function AdminLoadingBody({ variant }: { variant: AdminLoadingVariant }) {
  switch (variant) {
    case 'dashboard':
      return <AdminDashboardSkeleton />;
    case 'people':
      return <AdminTableSkeleton withAvatar cols={5} />;
    case 'news':
      return <AdminNewsSkeleton />;
    case 'gallery':
      return <AdminGallerySkeleton />;
    case 'editor':
      return <EditorSkeleton />;
    case 'form':
      return <AdminFormSkeleton />;
    case 'editorial':
      return <AdminEditorialSkeleton />;
    case 'categories':
      return <AdminCategoriesSkeleton />;
    case 'table':
      return <AdminTableSkeleton />;
    default: {
      const _exhaustive: never = variant;
      return _exhaustive;
    }
  }
}

const ADMIN_NAV_SKELETON_WIDTHS = [78, 68, 86, 72, 62, 70, 98, 74, 68, 104, 82, 58, 70];

export function AdminChromeSkeleton() {
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--admin-bg)' }} aria-busy="true" aria-label="Loading">
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 z-30 flex-col"
        style={{
          width: 240,
          minWidth: 240,
          background: 'var(--admin-sidebar)',
          borderRight: '1px solid var(--admin-border)',
        }}
      >
        <SkeletonTheme
          baseColor="var(--color-skeleton-on-dark)"
          highlightColor="var(--color-skeleton-on-dark-highlight)"
        >
          <div
            className="flex h-14 shrink-0 items-center justify-center px-4"
            style={{ borderBottom: '1px solid var(--admin-sidebar-border)' }}
          >
            <Skeleton width={128} height={26} />
          </div>
          <nav className="flex-1 space-y-0.5 overflow-hidden px-3 py-3">
            {ADMIN_NAV_SKELETON_WIDTHS.map((width, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
                <Skeleton circle width={18} height={18} />
                <Skeleton width={width} height={12} />
              </div>
            ))}
          </nav>
          <div className="px-3 py-3" style={{ borderTop: '1px solid var(--admin-sidebar-border)' }}>
            <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
              <Skeleton circle width={18} height={18} />
              <Skeleton width={56} height={12} />
            </div>
          </div>
        </SkeletonTheme>
      </aside>

      <div className="flex flex-1 flex-col lg:pl-[240px]">
        <AdminContentSkeletonTheme>
          <header
            className="sticky top-0 z-20 flex h-14 items-center gap-3 px-4 sm:px-6"
            style={{ background: 'var(--admin-topbar)', borderBottom: '1px solid var(--admin-border)' }}
          >
            <div className="grid h-9 w-9 place-items-center lg:hidden">
              <Skeleton width={18} height={14} />
            </div>
            <div className="flex-1" />
            <Skeleton circle width={36} height={36} />
            <Skeleton width={84} height={32} borderRadius={8} />
            <Skeleton circle width={32} height={32} />
            <div className="hidden sm:block">
              <Skeleton width={76} height={10} />
              <Skeleton width={92} height={8} className="mt-1.5" />
            </div>
          </header>
        </AdminContentSkeletonTheme>
        <main className="flex-1 p-4 sm:p-6">
          <AdminPageSkeleton />
        </main>
      </div>
    </div>
  );
}

export function EditorSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading">
      <div className="flex items-center justify-between pb-4" style={{ borderBottom: '1px solid var(--admin-border)' }}>
        <div className="flex items-center gap-3">
          <Skeleton width={32} height={32} />
          <div>
            <Skeleton width={140} height={18} />
            <Skeleton width={180} height={10} className="mt-1.5" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton width={96} height={32} />
          <Skeleton width={110} height={32} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Skeleton height={40} />
          <Skeleton height={320} />
        </div>
        <div className="space-y-3 rounded-lg p-4" style={adminCardStyle()}>
          <Skeleton width="50%" height={12} />
          <Skeleton height={36} />
          <Skeleton height={36} />
          <Skeleton height={36} />
          <Skeleton height={120} />
        </div>
      </div>
    </div>
  );
}
