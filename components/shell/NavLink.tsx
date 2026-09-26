"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  /** Opcional: a row "Todos os itens" do Figma (node 145:908) não tem ícone. */
  icon?: LucideIcon;
  /** Contador à direita. `0` é um valor válido e visível, não "sem contador". */
  count?: number;
};

/**
 * One Sidebar row (Figma node 199:5975 `nav-button`). Client-only because
 * active-state detection needs the browser pathname (layouts don't receive
 * it as a prop in the App Router).
 * Selected state is the quiet sidebar selection from DESIGN.md: `selected`
 * fill plus the same lime marker as `TagColumns`, never hue alone. The ink
 * inversion of the Figma node was the loudest block on the page (a near-white
 * slab in dark mode, above the primary action). The non-visual signal is
 * `aria-current="page"`.
 */
export function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive =
    pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex h-10 items-center justify-between gap-2.5 rounded-md px-3 py-2 transition-[background-color,color,scale] duration-(--motion-fast) ease-out-muvuca focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100",
        isActive
          ? "bg-selected text-foreground"
          : "text-muted-foreground hover:bg-hover hover:text-foreground",
      )}
    >
      {isActive && (
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-0.5 h-4 w-1 -translate-y-1/2 rounded-full bg-primary"
        />
      )}
      <span className="flex min-w-0 items-center gap-2.5">
        {Icon && (
          <Icon
            aria-hidden="true"
            className={cn(
              "size-4 shrink-0",
              isActive
                ? "text-foreground"
                : "text-muted-foreground group-hover:text-foreground",
            )}
          />
        )}
        <span
          className={cn(
            "truncate text-[13px] leading-none font-medium",
            isActive
              ? "text-foreground"
              : "text-muted-foreground group-hover:text-foreground",
          )}
        >
          {item.label}
        </span>
      </span>
      {typeof item.count === "number" && (
        <span
          data-slot="nav-count"
          className={cn(
            // On row hover the pill takes `hover` over the row's own `hover`,
            // so it stays one step apart instead of melting into the row.
            "flex h-[21px] shrink-0 items-center justify-center rounded-full bg-secondary px-2 py-0.5 text-[13px] leading-none font-medium tabular-nums shadow-light",
            isActive
              ? "text-foreground"
              : "text-muted-foreground group-hover:bg-hover group-hover:text-foreground",
          )}
        >
          {item.count}
        </span>
      )}
    </Link>
  );
}
