import { Skeleton } from "@/components/ui/skeleton";

/**
 * Just the table — head strip over six rows, no elevation of its own. Used inside the
 * cases panel while a filter apply re-sorts the list, so it must sit flat within the
 * panel that already lifts (no shadow inside a shadow). The full-page skeleton below
 * carries the same block with the panel's `shadow-raised`, since it stands alone.
 */
export function CasesResultsSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-xl border border-hairline bg-card"
      aria-busy
    >
      <span className="sr-only" role="status">
        Sorting cases
      </span>
      <div className="flex h-10 items-center gap-4 bg-surface-sunken px-4">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="hidden h-3 w-1/4 md:block" />
        <Skeleton className="h-3 w-1/6" />
      </div>
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 border-b border-hairline px-4 py-3 last:border-b-0"
        >
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="hidden h-5 w-1/4 md:block" />
          <Skeleton className="h-5 w-1/6" />
          <Skeleton className="ml-auto h-5 w-8" />
        </div>
      ))}
    </div>
  );
}

/** Folder and search list pages share this chrome while rows load. */
export function CasesListSkeleton() {
  return (
    <main className="flex min-w-0 flex-1 flex-col gap-8 p-6 md:p-8" aria-busy>
      <span className="sr-only" role="status">
        Loading cases
      </span>

      <Skeleton className="h-10 w-36" />

      <header className="flex flex-col gap-2">
        <Skeleton className="h-10 w-48" />
      </header>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex w-full max-w-lg flex-col gap-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-28 shrink-0 rounded-lg" />
        </div>

        <div className="overflow-hidden rounded-xl border border-hairline bg-card shadow-raised">
          {/* The head strip is the loaded table's `bg-surface-sunken` header, so the
              panel keeps its shape while the rows resolve. */}
          <div className="flex h-10 items-center gap-4 bg-surface-sunken px-4">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="hidden h-3 w-1/4 md:block" />
            <Skeleton className="h-3 w-1/6" />
          </div>
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="flex items-center gap-4 border-b border-hairline px-4 py-3 last:border-b-0"
            >
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="hidden h-5 w-1/4 md:block" />
              <Skeleton className="h-5 w-1/6" />
              <Skeleton className="ml-auto h-5 w-8" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
