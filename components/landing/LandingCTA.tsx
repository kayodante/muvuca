import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "@/components/landing/ScrollReveal";

export function LandingCTA() {
  return (
    <section
      id="cta"
      className="border-b border-border bg-muted/30 py-24 md:py-32"
    >
      <div className="mx-auto max-w-[1440px] px-4 text-center sm:px-6 lg:px-8">
        <ScrollReveal variant="stagger" className="mx-auto max-w-3xl">
          <h2 className="text-display t-stagger-line t-stagger-line--1 leading-[1.02] font-[560] tracking-[-0.03em] text-balance text-foreground sm:text-[clamp(2.5rem,5vw,4.25rem)]">
            Transforme sua muvuca em uma biblioteca.
          </h2>

          <p className="text-body-lg t-stagger-line t-stagger-line--2 mt-6 text-balance text-muted-foreground sm:text-xl">
            Guarde o que importa sem depender da memória para encontrar depois.
          </p>

          <div className="t-stagger-line t-stagger-line--3 mt-10 flex justify-center">
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                "gap-2 px-8 py-6 text-base font-semibold shadow-md transition-transform duration-(--motion-fast) ease-out-muvuca hover:scale-[1.02]",
              )}
            >
              Começar
              <ArrowRightIcon className="size-5" aria-hidden="true" />
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
