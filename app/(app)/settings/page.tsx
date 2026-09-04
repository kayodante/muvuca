import { ExportLibraryCard } from "@/components/settings/ExportLibraryCard";
import { ImportBackupCard } from "@/components/settings/ImportBackupCard";
import { ResetAccountCard } from "@/components/settings/ResetAccountCard";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { requireUser } from "@/lib/auth/require-user";
import { getThemePreference } from "@/lib/database/queries/preferences";

/** Settings page: theme preference, library export and account session. */
export default async function SettingsPage() {
  const [user, theme] = await Promise.all([
    requireUser(),
    getThemePreference(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 py-4 sm:py-8">
      <header className="space-y-2">
        <p className="text-brand-pixel text-muted-foreground">MUVUCA</p>
        <h1 className="text-headline-md">Configurações</h1>
        <p className="text-body-sm text-muted-foreground">
          Ajustes da sua biblioteca e da sua sessão.
        </p>
      </header>

      <section aria-labelledby="appearance-heading" className="space-y-4">
        <div>
          <h2 id="appearance-heading" className="text-headline-sm">
            Aparência
          </h2>
          <p className="text-body-sm text-muted-foreground">
            Escolha como o Muvuca acompanha sua preferência de cor.
          </p>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="space-y-1">
            <p className="text-label-md">Tema</p>
            <p className="text-body-sm text-muted-foreground">
              Sistema é o padrão para novas contas.
            </p>
          </div>
          <ThemeToggle theme={theme} />
        </div>
      </section>

      <section aria-labelledby="data-heading" className="space-y-4">
        <div>
          <h2 id="data-heading" className="text-headline-sm">
            Dados e Privacidade
          </h2>
          <p className="text-body-sm text-muted-foreground">
            Faça backup do seu acervo para portabilidade total.
          </p>
        </div>
        <ExportLibraryCard />
        <ImportBackupCard />
      </section>

      <section aria-labelledby="account-heading" className="space-y-4">
        <div>
          <h2 id="account-heading" className="text-headline-sm">
            Conta
          </h2>
          <p className="text-body-sm text-muted-foreground">
            Sua sessão usa acesso por link mágico.
          </p>
        </div>
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="min-w-0 space-y-1">
            <p className="text-label-md">Email</p>
            <p className="text-metadata truncate text-muted-foreground">
              {user.email ?? "Email não disponível"}
            </p>
          </div>
          <SignOutButton />
        </div>
      </section>

      <section aria-labelledby="danger-heading" className="space-y-4">
        <div>
          <h2 id="danger-heading" className="text-headline-sm">
            Zona de perigo
          </h2>
          <p className="text-body-sm text-muted-foreground">
            Ações destrutivas e irreversíveis.
          </p>
        </div>
        <ResetAccountCard />
      </section>
    </div>
  );
}
