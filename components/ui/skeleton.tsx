import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "rounded-md bg-muted motion-safe:animate-pulse [animation-duration:var(--pulse-dur,1000ms)]",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
