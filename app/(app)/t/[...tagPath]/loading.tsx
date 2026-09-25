import {
  LibraryGridSkeleton,
  LibraryToolbarSkeleton,
} from "@/components/items/LibraryGridSkeleton";
import { getDictionary } from "@/lib/i18n/server";
import { Skeleton } from "@/components/ui/skeleton";

export default async function TagLoading() {
  const t = await getDictionary();
  return (
    <div
      className="flex flex-col gap-6"
      role="status"
      aria-label={t.shell.loading.tag}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 py-1">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-3 w-3" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Tag Header with swatch & actions */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Skeleton className="mt-2.5 size-3 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </div>

      {/* Items Section */}
      <section className="mt-4 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-end gap-3 px-4">
          <Skeleton className="mr-auto h-6 w-44" />
          <LibraryToolbarSkeleton />
        </div>
        <LibraryGridSkeleton />
      </section>
    </div>
  );
}
