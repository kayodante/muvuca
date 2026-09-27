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
 * One Sidebar row (Figma node 199:5975 `all-button`). Client-only because
 * active-state detection needs the browser pathname (layouts don't receive
 * it as a prop in the App Router).
 * Active is the raised `surface-subtle` + `shadow-light` block, never hue
 * alone; the non-visual signal is `aria-current="page"`. Hover and Active
 * stack a light wash over their fill (`light-2` and `light-1`); Hover adds
 * only the inner rim, so it never competes with the active row.
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
        "flex h-10 items-center gap-2 rounded-sm px-3 py-2 transition-[background-color,box-shadow,color,scale] duration-(--motion-fast) ease-out-muvuca focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100",
        isActive
          ? "bg-secondary text-foreground shadow-light inset-shadow-[0_0_0_999px] inset-shadow-light-1"
          : "text-muted-foreground hover:bg-light-2 hover:shadow-[inset_0_0_0_0.5px_var(--color-light-4),inset_0_1px_0_0_var(--color-light-2)]",
      )}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        {Icon && <Icon aria-hidden="true" className="size-4 shrink-0" />}
        <span className="text-body-lg truncate">{item.label}</span>
      </span>
      {typeof item.count === "number" && (
        <span
          data-slot="nav-count"
          className={cn(
            "text-metadata shrink-0 rounded-full px-2 py-1 leading-none shadow-light",
            isActive ? "bg-border" : "bg-secondary",
          )}
        >
          {item.count}
        </span>
      )}
    </Link>
  );
}
