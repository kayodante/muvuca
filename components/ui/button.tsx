import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2Icon } from "lucide-react";

import { cn } from "@/lib/utils";
import { MatrixLoader } from "@/components/ui/matrix-loader";

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow,scale] duration-(--motion-fast) ease-out-muvuca outline-none select-none motion-reduce:transition-none active:not-aria-[haspopup]:scale-[0.97] motion-reduce:active:scale-100 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-create-button hover:bg-primary-strong",
        // Neutral variants lay `--hover` over whatever fill the button has
        // (their own or a caller's `bg-*`) instead of swapping it: swapping
        // an opaque fill for a translucent one made the sort button, which
        // callers set to `bg-surface`, go *darker* on hover in dark mode.
        outline:
          "border-border bg-background inset-shadow-[0_0_0_999px] inset-shadow-transparent hover:text-foreground hover:inset-shadow-hover aria-expanded:text-foreground aria-expanded:inset-shadow-hover",
        secondary:
          "bg-secondary text-secondary-foreground inset-shadow-[0_0_0_999px] inset-shadow-transparent hover:inset-shadow-hover",
        ghost:
          "inset-shadow-[0_0_0_999px] inset-shadow-transparent hover:text-foreground hover:inset-shadow-hover aria-expanded:text-foreground aria-expanded:inset-shadow-hover",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        // Lime as text fails AA on light surfaces (1.51:1); brand-accent is
        // the lime tone made for text and flips back to lime in dark.
        link: "text-brand-accent underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-10 gap-2 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-7 gap-1 px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 px-2.5 text-[0.8rem] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-2 px-4 text-base has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-10",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  pending = false,
  pendingLabel = "Carregando",
  pendingIndicator = "spinner",
  disabled,
  children,
  "aria-label": ariaLabel,
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    /**
     * Marks the button busy. Disables the control and shows a spinner
     * without changing the button's width, so confirming an action never
     * shifts layout.
     */
    pending?: boolean;
    /**
     * Accessible name while `pending`, used only when no `aria-label` is
     * already set. Visually hiding the label (`invisible`) also removes it
     * from the accessibility tree, so a pending icon-only/spinner-only
     * button would otherwise have no discernible name.
     */
    pendingLabel?: string;
    /**
     * Choose between standard spinner and quiet transitions.dev matrix loader.
     */
    pendingIndicator?: "spinner" | "matrix";
  }) {
  return (
    <ButtonPrimitive
      data-slot="button"
      aria-busy={pending || undefined}
      aria-label={ariaLabel ?? (pending ? pendingLabel : undefined)}
      disabled={disabled || pending}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {pending &&
        (pendingIndicator === "matrix" ? (
          <MatrixLoader
            variant="orbit"
            rounded
            aria-hidden="true"
            className="absolute size-4 text-current"
          />
        ) : (
          <Loader2Icon
            aria-hidden="true"
            // Spinner acelerado (600ms); sob prefers-reduced-motion desacelera em vez de remover.
            className="absolute size-4 animate-spin [animation-duration:600ms] motion-reduce:[animation-duration:1200ms]"
          />
        ))}
      <span className={cn("contents", pending && "invisible")}>{children}</span>
    </ButtonPrimitive>
  );
}

export { Button, buttonVariants };
