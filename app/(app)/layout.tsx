import { requireUser } from "@/lib/auth/require-user";
import { AppShell } from "@/components/shell/AppShell";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { getTagList, getTagRollupCounts } from "@/lib/database/queries/tags";
import { getUserPreferences } from "@/lib/database/queries/preferences";
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
  const [tags, preferences, itemsCount, tagCounts] = await Promise.all([
    getTagList(),
    getUserPreferences(),
    getLibraryItemsCount(),
    // A tree without counters beats a layout that fails on every route: the
    // RPC ships in a migration (0034) that reaches production only after
    // the Production environment is approved, and the app deploy does not
    // wait for it. getTagRollupCounts has already logged the failure.
    getTagRollupCounts().catch(() => undefined),
  ]);

  return (
    <AppShell
      theme={preferences.theme}
      userEmail={user.email}
      userName={preferences.displayName ?? user.name}
      avatarHash={preferences.avatarHash}
      signOutSlot={<SignOutButton />}
      tags={tags}
      itemsCount={itemsCount}
      tagCounts={tagCounts}
    >
      {children}
    </AppShell>
  );
}
