import type { ReactNode } from "react";
import Link from "next/link";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LibrarySearch } from "./LibrarySearch";

/**
 * Search stays visible in the shell, not hidden behind a shortcut. Search
 * and "create item" are structural here. Item creation links to the
 * library's focused dialog, keeping the shell server-first. Theme and
 * account controls live in the sidebar footer instead --
 * `mobileNav`/`sidebarToggle` are the only sidebar-visibility affordances
 * left here.
 */
export function Topbar({
  mobileNav,
  sidebarToggle,
}: {
  mobileNav: ReactNode;
  sidebarToggle: ReactNode;
}) {
  return (
    // Opaque, not a blurred scrim: glass is not part of this design
    // language, and the surface tone (not the canvas tone) is what lifts
    // the header off the page.
    <header className="sticky top-0 z-30 flex min-h-[var(--layout-topbar-min-height)] items-center gap-3 border-b border-border bg-card px-4 py-3 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <div className="md:hidden">{mobileNav}</div>
        <div className="hidden md:block">{sidebarToggle}</div>
      </div>

      <div className="flex flex-1 justify-center">
        <LibrarySearch />
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href="/library?create=1" />}
        >
          <PlusIcon aria-hidden="true" data-icon="inline-start" />
          {/* `sr-only` below `sm`, not `hidden`: an icon-only button still
              needs a discernible name at every viewport. */}
          <span className="sr-only sm:not-sr-only">Criar item</span>
        </Button>
      </div>
    </header>
  );
}
