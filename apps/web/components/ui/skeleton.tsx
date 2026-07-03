type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-aurora-surface-2 ${className}`.trim()}
      aria-hidden
    />
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 p-1" data-testid="page-skeleton">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function BoardSkeleton() {
  return (
    <div className="space-y-4" data-testid="board-skeleton">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-6 w-40" />
      </div>
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-72 shrink-0 space-y-2">
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProjectListSkeleton() {
  return (
    <div className="space-y-3" data-testid="project-list-skeleton">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  );
}

export function MembersTableSkeleton() {
  return (
    <div className="space-y-2" data-testid="members-table-skeleton">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function ShellSkeleton() {
  return (
    <div className="flex min-h-screen">
      <Skeleton className="hidden w-56 shrink-0 md:block" />
      <div className="flex flex-1 flex-col">
        <Skeleton className="h-14 w-full" />
        <div className="p-4">
          <PageSkeleton />
        </div>
      </div>
    </div>
  );
}
