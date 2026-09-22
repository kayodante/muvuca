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
 * Selected state is the `bg-ink text-surface` inverted contrast of the Figma
 * node; the non-visual signal is `aria-current="page"`.
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
        "group flex h-10 items-center justify-between gap-2.5 rounded-md px-3 py-2 transition-[background-color,color,transform,box-shadow] duration-(--motion-fast) ease-out-muvuca active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:active:scale-100 motion-reduce:transition-none",
        isActive
          ? "bg-ink text-surface shadow-light"
          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
      )}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        {Icon && (
          <Icon
            aria-hidden="true"
            className={cn(
              "size-4 shrink-0",
              isActive
                ? "text-surface"
                : "text-muted-foreground group-hover:text-foreground",
            )}
          />
        )}
        <span
          className={cn(
            "truncate text-[13px] leading-none font-medium",
            isActive
              ? "text-surface"
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
            "flex h-[21px] shrink-0 items-center justify-center rounded-full px-2 py-0.5 text-[13px] leading-none font-medium tabular-nums shadow-light",
            isActive
              ? "bg-ink-muted text-surface"
              : "bg-secondary text-muted-foreground group-hover:bg-border/60",
          )}
        >
          {item.count}
        </span>
      )}
    </Link>
  );
}
