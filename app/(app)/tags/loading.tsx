import { Skeleton } from "@/components/ui/skeleton";

export default function TagsLoading() {
  return (
    <div
      className="flex flex-col gap-6"
      role="status"
      aria-label="Carregando tags"
    >
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-10 w-28 rounded-md" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-10 w-full max-w-xs rounded-md" />
      </div>

      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="flex items-center gap-2 rounded-md py-1 pr-1 pl-2"
          >
            <Skeleton className="size-2 shrink-0 rounded-full" />
            <Skeleton
              className="h-5 rounded"
              style={{
                width: `${Math.max(6, ((index * 7 + 11) % 18) + 8)}rem`,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
