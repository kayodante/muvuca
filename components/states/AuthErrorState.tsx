/**
 * Generic, recoverable error notice for the login/callback surface: an
 * invalid callback always shows a generic recoverable error, never the
 * underlying Supabase error message.
 */
export function AuthErrorState() {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      Não foi possível concluir o login. O link pode ter expirado ou já ter sido
      usado. Solicite um novo link abaixo.
    </div>
  );
}
