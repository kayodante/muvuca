import Link from "next/link";
import type { ReactNode } from "react";

import type { FlatTag } from "@/lib/tags/tree";
import type { Theme } from "@/lib/theme/preference";
import { Logo } from "@/components/brand/Logo";
import { TagNavigation } from "./TagNavigation";
import { ThemeToggle } from "./ThemeToggle";
import { SidebarUserMenu } from "./SidebarUserMenu";

/**
 * Structural sidebar content: a rounded card of its
 * own, not flush with the rail -- a raised header (brand + theme) and
 * footer (account) bracket a tag tree that fills the whole space between
 * them. Everything else (Tags entry aside, import, settings, version)
 * lives in the account menu. Rendered both in the fixed 272px desktop
 * rail and inside the mobile Sheet.
 */
export function Sidebar({
  tags,
  theme,
  userEmail,
  signOutSlot,
}: {
  tags?: FlatTag[];
  theme: Theme;
  userEmail?: string | null;
  signOutSlot: ReactNode;
}) {
  return (
    <nav
      aria-label="Navegação principal"
      className="flex h-full flex-col overflow-hidden rounded-md"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 bg-secondary p-2">
        {/* Official Muvuca brand mark */}
        <Link
          href="/library"
          className="flex items-center rounded-md px-3 py-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <Logo size="md" />
        </Link>
        <ThemeToggle theme={theme} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col bg-card p-4">
        <TagNavigation tags={tags ?? []} />
      </div>

      <div className="shrink-0 bg-secondary p-2">
        <SidebarUserMenu userEmail={userEmail} signOutSlot={signOutSlot} />
      </div>
    </nav>
  );
}
