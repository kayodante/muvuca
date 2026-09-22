import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "rounded-md bg-muted [animation-duration:var(--pulse-dur,1000ms)] motion-safe:animate-pulse",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
