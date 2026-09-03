export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
      <div className="skeleton h-9 w-64 rounded-xl" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-44 rounded-2xl" />
        ))}
      </div>
      <div className="skeleton h-16 w-full rounded-2xl" />
      <div className="skeleton h-16 w-full rounded-2xl" />
    </div>
  );
}