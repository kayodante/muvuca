import { ExportLibraryCard } from "@/components/settings/ExportLibraryCard";
import { ImportBackupCard } from "@/components/settings/ImportBackupCard";
import { LanguageSelect } from "@/components/settings/LanguageSelect";
import { ProfileCard } from "@/components/settings/ProfileCard";
import { ResetAccountCard } from "@/components/settings/ResetAccountCard";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { requireUser } from "@/lib/auth/require-user";
import { getUserPreferences } from "@/lib/database/queries/preferences";
import { getDictionary, getLocale } from "@/lib/i18n/server";

/** Settings page: profile, theme/language preference, library export and account session. */
export default async function SettingsPage() {
  const [user, { theme, displayName }, locale, t] = await Promise.all([
    requireUser(),
    getUserPreferences(),
    getLocale(),
    getDictionary(),
  ]);
  const fallbackName =
    user.name || user.email?.split("@")[0] || t.settings.profile.fallbackName;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 py-4 sm:py-8">
      <header className="space-y-2">
        <p className="text-brand-pixel text-muted-foreground">MUVUCA</p>
        <h1 className="text-headline-md">{t.settings.title}</h1>
        <p className="text-body-sm text-muted-foreground">
          {t.settings.subtitle}
        </p>
      </header>

      <section aria-labelledby="profile-heading" className="space-y-4">
        <div>
          <h2 id="profile-heading" className="text-headline-sm">
            {t.settings.profile.heading}
          </h2>
          <p className="text-body-sm text-muted-foreground">
            {t.settings.profile.description}
          </p>
        </div>
        <ProfileCard displayName={displayName} fallbackName={fallbackName} />
      </section>

      <section aria-labelledby="appearance-heading" className="space-y-4">
        <div>
          <h2 id="appearance-heading" className="text-headline-sm">
            {t.settings.appearance.heading}
          </h2>
          <p className="text-body-sm text-muted-foreground">
            {t.settings.appearance.description}
          </p>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="space-y-1">
            <p className="text-label-md">{t.settings.appearance.themeLabel}</p>
            <p className="text-body-sm text-muted-foreground">
              {t.settings.appearance.themeHint}
            </p>
          </div>
          <ThemeToggle theme={theme} />
        </div>
      </section>

      <section aria-labelledby="language-heading" className="space-y-4">
        <div>
          <h2 id="language-heading" className="text-headline-sm">
            {t.settings.language.heading}
          </h2>
          <p className="text-body-sm text-muted-foreground">
            {t.settings.language.description}
          </p>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="space-y-1">
            <p className="text-label-md">{t.settings.language.label}</p>
            <p className="text-body-sm text-muted-foreground">
              {t.settings.language.hint}
            </p>
          </div>
          <LanguageSelect locale={locale} />
        </div>
      </section>

      <section aria-labelledby="data-heading" className="space-y-4">
        <div>
          <h2 id="data-heading" className="text-headline-sm">
            {t.settings.data.heading}
          </h2>
          <p className="text-body-sm text-muted-foreground">
            {t.settings.data.description}
          </p>
        </div>
        <ExportLibraryCard />
        <ImportBackupCard />
      </section>

      <section aria-labelledby="account-heading" className="space-y-4">
        <div>
          <h2 id="account-heading" className="text-headline-sm">
            {t.settings.account.heading}
          </h2>
          <p className="text-body-sm text-muted-foreground">
            {t.settings.account.description}
          </p>
        </div>
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="min-w-0 space-y-1">
            <p className="text-label-md">{t.settings.account.emailLabel}</p>
            <p className="text-metadata truncate text-muted-foreground">
              {user.email ?? t.settings.account.emailUnavailable}
            </p>
          </div>
          <SignOutButton />
        </div>
      </section>

      <section aria-labelledby="danger-heading" className="space-y-4">
        <div>
          <h2 id="danger-heading" className="text-headline-sm">
            {t.settings.danger.heading}
          </h2>
          <p className="text-body-sm text-muted-foreground">
            {t.settings.danger.description}
          </p>
        </div>
        <ResetAccountCard />
      </section>
    </div>
  );
}
