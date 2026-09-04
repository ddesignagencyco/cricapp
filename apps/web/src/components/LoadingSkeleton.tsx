'use client';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}

interface LoadingSkeletonProps {
  rows?: number;
  variant?: string;
}

export default function LoadingSkeleton({ rows = 3, variant = 'card' }: LoadingSkeletonProps) {
  if (variant === 'list') {
    return (
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
      </div>
    );
  }
  if (variant === 'table') {
    return (
      <div className="space-y-2">
        <div className="skeleton h-10 w-full rounded-lg" />
        {Array.from({ length: rows }).map((_, i) => <div key={i} className="skeleton h-12 w-full rounded-lg" />)}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: rows }).map((_, i) => <div key={i} className="skeleton h-44 rounded-2xl" />)}
    </div>
  );
}
