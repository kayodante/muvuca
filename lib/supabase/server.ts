import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database/generated.types";

/**
 * Server Supabase client for Server Components/Actions.
 * Identity verification via `getClaims()` lives in `lib/auth/require-user.ts`.
 * The `Database` generic is generated from the live schema, never
 * hand-copied, so every `.from()`/`.rpc()` call site is type-checked
 * against the real schema.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component with no write access to
            // cookies; safe to ignore once E1 wires session refresh
            // into `proxy.ts`.
          }
        },
      },
    },
  );
}
