"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  ChevronsUpDownIcon,
  SettingsIcon,
  TagIcon,
  UploadIcon,
} from "lucide-react";

import packageJson from "@/package.json";
import { useDictionary } from "@/lib/i18n/client";
import { UserAvatar } from "@/components/shell/UserAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Sidebar footer identity + account menu. The trigger
 * is the whole row, not just the chevron -- a bigger hit target and it
 * reads as one control, not row-plus-button. Everything that isn't the
 * tag tree itself (Tags, import, settings, version) lives here so the tag
 * list is the only thing between the brand header and this footer.
 */
export function SidebarUserMenu({
  userEmail,
  userName,
  signOutSlot,
}: {
  userEmail?: string | null;
  userName?: string | null;
  signOutSlot: ReactNode;
}) {
  const t = useDictionary();
  if (!userEmail) return null;

  const displayName =
    userName || userEmail.split("@")[0] || t.shell.userMenu.fallbackName;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-md p-2 text-left transition-[background-color,transform] duration-(--motion-fast) ease-out-muvuca hover:bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
          />
        }
      >
        <UserAvatar name={displayName} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span
            dir="auto"
            className="text-label-md truncate font-medium text-foreground"
          >
            {displayName}
          </span>
          <span
            dir="auto"
            className="text-metadata truncate text-muted-foreground"
          >
            {userEmail}
          </span>
        </div>
        <ChevronsUpDownIcon
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[--anchor-width] p-1">
        <DropdownMenuItem render={<Link href="/tags" />}>
          <TagIcon aria-hidden="true" />
          {t.shell.userMenu.tags}
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/library?import=1" />}>
          <UploadIcon aria-hidden="true" />
          {t.shell.userMenu.importBookmarks}
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/settings" />}>
          <SettingsIcon aria-hidden="true" />
          {t.shell.userMenu.settings}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {signOutSlot}
        <DropdownMenuSeparator />
        <p className="px-1.5 py-1 text-xs text-muted-foreground">
          Muvuca v{packageJson.version}
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
