export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6">
      <div className="h-40 animate-pulse rounded-3xl bg-card ring-1 ring-lborder" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="h-28 animate-pulse rounded-3xl bg-card ring-1 ring-lborder" />
        <div className="h-28 animate-pulse rounded-3xl bg-card ring-1 ring-lborder" />
        <div className="h-28 animate-pulse rounded-3xl bg-card ring-1 ring-lborder" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="h-44 animate-pulse rounded-3xl bg-card ring-1 ring-lborder" />
        <div className="h-44 animate-pulse rounded-3xl bg-card ring-1 ring-lborder" />
      </div>
    </div>
  );
}
