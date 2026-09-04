"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
};

/**
 * One Sidebar row. Client-only because active-state detection needs the
 * browser pathname (layouts don't receive it as a prop in the App Router).
 * Selection uses a subtle surface change plus a small lime indicator,
 * never color alone.
 */
export function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive =
    pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  if (item.disabled) {
    return (
      <span
        aria-disabled="true"
        className="text-label-md flex items-center gap-2.5 rounded-md px-3 py-2 text-muted-foreground/60"
      >
        <Icon aria-hidden="true" className="size-4 shrink-0" />
        {item.label}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group text-label-md relative flex items-center gap-2.5 rounded-md px-3 py-2 transition-colors duration-(--motion-fast) ease-out-muvuca focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none",
        isActive
          ? "bg-secondary text-foreground"
          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
      )}
    >
      {isActive && (
        <span
          aria-hidden="true"
          className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary"
        />
      )}
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}
