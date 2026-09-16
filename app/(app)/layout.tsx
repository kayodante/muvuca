import { requireUser } from "@/lib/auth/require-user";
import { AppShell } from "@/components/shell/AppShell";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { getTagList } from "@/lib/database/queries/tags";
import { getThemePreference } from "@/lib/database/queries/preferences";
import { getLibraryItemsCount } from "@/lib/database/queries/items";

/**
 * Protects every route under `(app)`. `requireUser()` redirects to `/login`
 * when there is no valid session -- server-side, on every request; hiding
 * UI is not authorization.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const [tags, theme, itemsCount] = await Promise.all([
    getTagList(),
    getThemePreference(),
    getLibraryItemsCount(),
  ]);

  return (
    <AppShell
      theme={theme}
      userEmail={user.email}
      signOutSlot={<SignOutButton />}
      tags={tags}
      itemsCount={itemsCount}
    >
      {children}
    </AppShell>
  );
}
