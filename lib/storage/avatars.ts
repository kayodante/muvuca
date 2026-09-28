import { PreviewError } from "@/lib/metadata/errors";
import type { createClient } from "@/lib/supabase/server";

/**
 * Storage helpers for the `avatars` bucket (ADR-017, 0035_user_avatar.sql).
 * Mirrors `previews.ts`'s shape (own-user client, `PreviewError` on
 * failure) but scoped to a single content-addressed object per user
 * instead of a per-item folder.
 */
export const AVATAR_BUCKET = "avatars";

/**
 * `${userId}/${hash}.webp`. Always rebuilt from the session's own
 * `user.id` and a hash the caller already validated -- never read back from
 * the database as a free-form path.
 */
export function avatarObjectKey(userId: string, hash: string): string {
  return `${userId}/${hash}.webp`;
}

export async function putAvatarObject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  key: string,
  bytes: Buffer,
): Promise<void> {
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(key, bytes, {
      contentType: "image/webp",
      upsert: true,
    });

  if (error) {
    throw new PreviewError(
      "storage_failed",
      "Falha ao enviar avatar para o Storage.",
    );
  }
}

/**
 * Removes every object under `${userId}/` except `${keepHash}.webp` (all of
 * them when `keepHash` is omitted, e.g. on avatar removal or account
 * reset). A single `list()` at Storage's default page size (100) is enough:
 * the prefix holds exactly one live object plus rare orphans from a failed
 * mid-swap upload (ADR-017's "ordem da troca") -- paginate only if that
 * assumption changes.
 */
export async function removeAvatarObjects(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  keepHash?: string,
): Promise<void> {
  const { data, error: listError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .list(userId);

  if (listError) {
    throw new PreviewError(
      "storage_failed",
      "Falha ao listar objetos de avatar no Storage.",
    );
  }

  if (!data || data.length === 0) return;

  const keepName = keepHash ? `${keepHash}.webp` : null;
  const paths = data
    .filter((object) => object.name !== keepName)
    .map((object) => `${userId}/${object.name}`);

  if (paths.length === 0) return;

  const { error: removeError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .remove(paths);

  if (removeError) {
    throw new PreviewError(
      "storage_failed",
      "Falha ao remover objetos de avatar do Storage.",
    );
  }
}
