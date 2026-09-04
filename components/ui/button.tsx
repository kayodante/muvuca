import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2Icon } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] duration-(--motion-fast) ease-out-muvuca outline-none select-none motion-reduce:transition-none active:not-aria-[haspopup]:scale-[0.97] motion-reduce:active:scale-100 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-strong",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
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
      {pending && (
        <Loader2Icon
          aria-hidden="true"
          // Spinner acelerado (600ms); sob prefers-reduced-motion desacelera em vez de remover.
          className="absolute size-4 animate-spin [animation-duration:600ms] motion-reduce:[animation-duration:1200ms]"
        />
      )}
      <span className={cn("contents", pending && "invisible")}>{children}</span>
    </ButtonPrimitive>
  );
}

export { Button, buttonVariants };
