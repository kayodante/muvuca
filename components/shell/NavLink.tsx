"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type NavItem = {
  label: string;
  href: string;
  /** Opcional: a row "Todos os itens" do Figma (node 145:908) não tem ícone. */
  icon?: LucideIcon;
  /** Contador à direita. `0` é um valor válido e visível, não "sem contador". */
  count?: number;
};

/**
 * One Sidebar row. Client-only because active-state detection needs the
 * browser pathname (layouts don't receive it as a prop in the App Router).
 * Selected state is the `bg-secondary` surface of the Figma node; the
 * non-visual signal is `aria-current="page"`.
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
        "text-label-md flex items-center justify-between gap-2.5 rounded-md px-3 py-2 transition-colors duration-(--motion-fast) ease-out-muvuca focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none",
        isActive
          ? "bg-secondary text-foreground"
          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
      )}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        {Icon && <Icon aria-hidden="true" className="size-4 shrink-0" />}
        <span className="truncate">{item.label}</span>
      </span>
      {typeof item.count === "number" && (
        // Span, não `Badge`: o contador usa o token `.text-metadata`
        // (Geist Mono, DESIGN.md → "contadores técnicos"), e a cva do Badge
        // fixa `text-xs font-medium` na layer `utilities`, que vence
        // `.text-metadata` (layer `components`) sem que `cn()` perceba.
        <span
          data-slot="nav-count"
          className="text-metadata shrink-0 rounded-full border border-border bg-card px-2 py-0.5 text-muted-foreground tabular-nums"
        >
          {item.count}
        </span>
      )}
    </Link>
  );
}
