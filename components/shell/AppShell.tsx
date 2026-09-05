"use client";

import { useState, type ReactNode } from "react";
import { PanelLeftIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Theme } from "@/lib/theme/preference";
import type { FlatTag } from "@/lib/tags/tree";
import { Button } from "@/components/ui/button";
import { MobileNav } from "./MobileNav";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

/**
 * App shell composition: fixed sidebar + topbar + fluid main region,
 * desktop; sidebar becomes a Sheet on mobile. Client component only for
 * the desktop collapse toggle -- it still never
 * fetches data itself. `theme`/`userEmail`/`signOutSlot` come from the
 * caller (`app/(app)/layout.tsx`) because this component never reads
 * cookies or session state itself.
 */
export function AppShell({
  children,
  theme,
  userEmail,
  signOutSlot,
  tags,
}: {
  children: ReactNode;
  theme: Theme;
  userEmail?: string | null;
  signOutSlot: ReactNode;
  tags?: FlatTag[];
}) {
  const [collapsed, setCollapsed] = useState(false);

  const sidebar = (
    <Sidebar
      tags={tags}
      theme={theme}
      userEmail={userEmail}
      signOutSlot={signOutSlot}
    />
  );

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground md:flex-row">
      <aside
        className={cn(
          // `sticky` and `overflow-hidden` (clips the fixed-width child
          // during the collapse animation) must live on the SAME element:
          // an intervening ancestor with any non-visible overflow stops a
          // descendant's `position: sticky` from tracking the page scroll.
          "sticky top-0 hidden h-screen shrink-0 overflow-hidden transition-[width] duration-(--motion-base) ease-out-muvuca motion-reduce:transition-none md:block",
          collapsed ? "md:w-0" : "md:w-[var(--layout-sidebar-width)]",
        )}
      >
        <div className="h-full w-[var(--layout-sidebar-width)]">{sidebar}</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          mobileNav={<MobileNav>{sidebar}</MobileNav>}
          sidebarToggle={
            <Button
              variant="secondary"
              size="icon"
              aria-label={
                collapsed ? "Expandir barra lateral" : "Recolher barra lateral"
              }
              aria-expanded={!collapsed}
              onClick={() => setCollapsed((value) => !value)}
            >
              <PanelLeftIcon aria-hidden="true" />
            </Button>
          }
        />
        <main className="mx-auto w-full max-w-[var(--layout-content-max)] flex-1 px-4 pt-4 pb-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
