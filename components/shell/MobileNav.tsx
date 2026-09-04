"use client";

import { useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { MenuIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * Sidebar-as-Sheet for small viewports: the sidebar becomes a sheet/drawer
 * below the desktop breakpoint. Controlled so it closes on navigation --
 * clicking a nav link changes the route but doesn't otherwise dismiss an
 * open Sheet.
 */
export function MobileNav({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Some nav items (e.g. "Importar favoritos" -> /library?import=1) differ
  // from the current route only in the query string, so pathname alone
  // isn't enough to detect a navigation -- include the search string too.
  const route = `${pathname}?${searchParams.toString()}`;
  const [open, setOpen] = useState(false);
  // Adjusting state during render (not an effect) on route change --
  // avoids the extra commit + effect pass react-hooks/set-state-in-effect
  // warns about for this exact "reset on prop change" pattern.
  const [renderedRoute, setRenderedRoute] = useState(route);
  if (route !== renderedRoute) {
    setRenderedRoute(route);
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Abrir navegação" />
        }
      >
        <MenuIcon aria-hidden="true" />
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[var(--layout-sidebar-width)] p-0 sm:max-w-none"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Navegação</SheetTitle>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}
