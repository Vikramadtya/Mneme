import { Skeleton } from '../../ui';

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-10 sm:px-6" aria-busy="true">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-40 w-full" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    </div>
  );
}
