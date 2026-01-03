export function FileCardSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-xl animate-pulse">
      <div className="h-32 bg-surface-elevated" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-surface-elevated rounded w-3/4" />
        <div className="h-3 bg-surface-elevated rounded w-full" />
        <div className="h-3 bg-surface-elevated rounded w-5/6" />
      </div>
    </div>
  );
}

export function SearchResultsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-surface-elevated rounded w-64" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <FileCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
