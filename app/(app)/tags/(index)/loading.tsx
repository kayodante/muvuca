import { getDictionary } from "@/lib/i18n/server";
import { Skeleton } from "@/components/ui/skeleton";

export default async function TagsLoading() {
  const t = await getDictionary();
  return (
    <div
      className="flex flex-col gap-6"
      role="status"
      aria-label={t.shell.loading.tags}
    >
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-24" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28 rounded-md" />
          <Skeleton className="h-10 w-28 rounded-md" />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] xl:items-start">
        <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border p-2">
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div className="flex flex-col gap-px p-1.5 pt-10 sm:w-60">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="flex h-9 items-center gap-2.5 pl-3">
                <Skeleton className="size-2 shrink-0 rounded-full" />
                <Skeleton
                  className="h-4 rounded"
                  style={{ width: `${((index * 7 + 11) % 6) + 5}rem` }}
                />
              </div>
            ))}
          </div>
        </div>
        <Skeleton className="hidden h-80 rounded-2xl xl:block" />
      </div>
    </div>
  );
}
