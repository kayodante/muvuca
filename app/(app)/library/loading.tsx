import {
  LibraryGridSkeleton,
  LibraryToolbarSkeleton,
} from "@/components/items/LibraryGridSkeleton";
import { getDictionary } from "@/lib/i18n/server";
import { Skeleton } from "@/components/ui/skeleton";

export default async function LibraryLoading() {
  const t = await getDictionary();
  return (
    <div
      className="flex flex-col gap-6"
      role="status"
      aria-label={t.shell.loading.library}
    >
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-1 h-4 w-20" />
        </div>
        <Skeleton className="h-10 w-44 rounded-md" />
      </section>
      <LibraryToolbarSkeleton />
      <div className="mt-2">
        <LibraryGridSkeleton />
      </div>
    </div>
  );
}
