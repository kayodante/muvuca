import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Mirrors the filters and sort toolbar geometry during route transitions. */
export function LibraryToolbarSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
      <Skeleton className="h-8 w-36 rounded-md" />
      <Skeleton className="h-8 w-32 rounded-md" />
      <Skeleton className="h-8 w-40 rounded-md" />
    </div>
  );
}

// Classe compartilhada: cada skeleton do card lê o atraso do wrapper via
// custom property, mantendo os blocos de um mesmo card em fase entre si.
const DELAYED = "[animation-delay:var(--skeleton-delay)]";

/**
 * Mirrors the gallery's card geometry during route transitions -- the
 * `aspect-[365/172]` block up top keeps the skeleton's proportions matching
 * the loaded `ItemCard`'s media area, since real link
 * cards are now taller than a plain text card. The ratio has to stay in
 * sync with `LinkPreviewMedia`; a mismatch here is layout shift on every
 * load.
 */
export function LibraryGridSkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))] gap-4">
      {Array.from({ length: 8 }, (_, index) => (
        <div
          key={index}
          // Escalona o pulso por card (~90ms, ciclando a cada 4) para não ler
          // como um plano piscando em uníssono. Sem efeito quando
          // motion-safe:animate-pulse não roda (prefers-reduced-motion).
          style={
            {
              "--skeleton-delay": `${(index % 4) * 90}ms`,
            } as React.CSSProperties
          }
          className="min-h-56 overflow-hidden rounded-xl border border-border"
        >
          <Skeleton
            className={cn("aspect-[365/172] w-full rounded-none", DELAYED)}
          />
          <div className="p-4">
            <Skeleton className={cn("h-3 w-24", DELAYED)} />
            <Skeleton className={cn("mt-6 h-6 w-4/5", DELAYED)} />
            <Skeleton className={cn("mt-2 h-4 w-full", DELAYED)} />
            <Skeleton className={cn("mt-1 h-4 w-3/4", DELAYED)} />
            <div className="mt-10 flex gap-2">
              <Skeleton className={cn("h-7 w-16 rounded-full", DELAYED)} />
              <Skeleton className={cn("h-7 w-20 rounded-full", DELAYED)} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
