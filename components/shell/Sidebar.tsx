"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { UploadIcon } from "lucide-react";

import type { FlatTag } from "@/lib/tags/tree";
import type { Theme } from "@/lib/theme/preference";
import { useDictionary } from "@/lib/i18n/client";
import { Logo } from "@/components/brand/Logo";
import { NavLink } from "./NavLink";
import { TagNavigation } from "./TagNavigation";
import { ThemeToggle } from "./ThemeToggle";
import { SidebarUserMenu } from "./SidebarUserMenu";

/**
 * Structural sidebar content: a rounded card of its
 * own, not flush with the rail -- a raised header (brand + theme) and
 * footer (import + account) bracket a tag tree that fills the whole space
 * between them. Rendered both in the fixed 272px desktop
 * rail and inside the mobile Sheet.
 */
export function Sidebar({
  tags,
  theme,
  userEmail,
  userName,
  avatarHash,
  signOutSlot,
  itemsCount,
  tagCounts,
}: {
  tags?: FlatTag[];
  theme: Theme;
  userEmail?: string | null;
  userName?: string | null;
  avatarHash?: string | null;
  signOutSlot: ReactNode;
  itemsCount?: number;
  tagCounts?: Record<string, number>;
}) {
  const t = useDictionary();
  return (
    <nav
      aria-label={t.shell.nav.ariaLabel}
      className="flex h-full flex-col overflow-hidden"
    >
      {/* Same height as the Topbar so both bottom borders form one line. */}
      <div className="flex min-h-[var(--layout-topbar-min-height)] shrink-0 items-center justify-between gap-2 border-r border-b border-border bg-secondary py-2 pr-4 pl-2">
        {/* Official Muvuca brand mark */}
        <Link
          href="/library"
          className="flex items-center rounded-md px-3 py-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <Logo size="md" />
        </Link>
        <ThemeToggle theme={theme} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 border-r border-border bg-card p-4">
        {/* Acima do heading "TAGS" (Figma 145:908). Fora do TagNavigation de
            propósito: aquele componente devolve null sem tags, e esta row
            precisa existir numa biblioteca vazia. */}
        <div className="shrink-0">
          <NavLink
            item={{
              label: t.shell.nav.allItems,
              href: "/library",
              count: itemsCount,
            }}
          />
        </div>
        <TagNavigation tags={tags ?? []} counts={tagCounts} />
      </div>

      <div className="shrink-0 border-t border-r border-border bg-secondary p-2">
        <Link
          href="/library?import=1"
          className="text-body-sm mb-1 flex min-h-10 items-center gap-2 rounded-md px-3 text-muted-foreground hover:bg-light-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <UploadIcon aria-hidden="true" className="size-4" />
          {t.shell.userMenu.importBookmarks}
        </Link>
        <SidebarUserMenu
          userEmail={userEmail}
          userName={userName}
          avatarHash={avatarHash}
          signOutSlot={signOutSlot}
        />
      </div>
    </nav>
  );
}
