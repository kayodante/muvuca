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
      className="flex flex-col gap-4"
      role="status"
      aria-label={t.shell.loading.library}
    >
      <div className="flex flex-wrap items-center justify-end gap-3 px-4">
        <Skeleton className="mr-auto h-6 w-32" />
        <LibraryToolbarSkeleton />
      </div>
      <LibraryGridSkeleton />
    </div>
  );
}
