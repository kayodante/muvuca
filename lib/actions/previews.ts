"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/require-user";
import type { Database } from "@/lib/database/generated.types";
import { enrichOne, type EnrichOutcome } from "@/lib/metadata/enrich";
import { logEvent } from "@/lib/security/logging";
import {
  PREVIEW_BUCKET,
  previewObjectKey,
  putPreviewObject,
} from "@/lib/storage/previews";
import { createClient } from "@/lib/supabase/server";
import {
  itemIdSchema,
  PREVIEW_CLAIM_LIMIT,
  previewScopeSchema,
} from "@/lib/validation/item";
import {
  fail,
  mapPostgresErrorCode,
  ok,
  type ActionResult,
} from "@/lib/utils/result";

type PostgrestErrorLike = { code?: string };
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const BUCKET = PREVIEW_BUCKET;
/** Drains in chunks of 3: bounded, never sequential and never unlimited. */
const DRAIN_CONCURRENCY = 3;

const BLOCKED_ERROR_CODES = new Set([
  "blocked_scheme",
  "blocked_host",
  "blocked_private_ip",
]);
const IMAGE_ERROR_CODES = new Set(["image_rejected", "decode_failed"]);

function mapRefreshError(error: PostgrestErrorLike): ActionResult<never> {
  if (error.code === "P0001") {
    return fail("NOT_FOUND", "Preview não encontrado.");
  }
  switch (mapPostgresErrorCode(error.code)) {
    case "CONSTRAINT_VIOLATION":
      return fail(
        "CONSTRAINT_VIOLATION",
        "Não foi possível atualizar o preview.",
      );
    default:
      return fail("UNKNOWN", "Não foi possível concluir a operação.");
  }
}

async function processInChunks<T, R>(
  items: readonly T[],
  size: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let start = 0; start < items.length; start += size) {
    const chunk = items.slice(start, start + size);
    results.push(...(await Promise.all(chunk.map(worker))));
  }
  return results;
}

/** Best-effort: a Storage remove failure here only logs, never throws (it must not fail an otherwise-successful job). */
async function bestEffortRemove(
  supabase: SupabaseServerClient,
  key: string,
  itemId: string,
  userId: string,
) {
  const { error } = await supabase.storage.from(BUCKET).remove([key]);
  if (error) {
    logEvent({
      event: "preview.cleanup_failed",
      status: "failure",
      entityId: itemId,
      userId,
    });
  }
}

function logJobFailure(
  errorCode: string,
  itemId: string,
  userId: string,
  durationMs: number,
) {
  if (BLOCKED_ERROR_CODES.has(errorCode)) {
    logEvent({
      event: "preview.blocked",
      status: "failure",
      errorClass: errorCode,
      entityId: itemId,
      userId,
      durationMs,
    });
    return;
  }
  if (IMAGE_ERROR_CODES.has(errorCode)) {
    logEvent({
      event: "preview.image_rejected",
      status: "failure",
      errorClass: errorCode,
      entityId: itemId,
      userId,
      durationMs,
    });
    return;
  }
  logEvent({
    event: "preview.failed",
    status: "failure",
    errorClass: errorCode,
    entityId: itemId,
    userId,
    durationMs,
  });
}

/** Shared by both failure paths (enrichOne failing outright, and a thumbnail upload failing after enrichOne succeeded) so the RPC call/error-log shape only lives in one place. */
async function completeFailed(
  supabase: SupabaseServerClient,
  userId: string,
  job: { item_id: string },
  errorCode: string,
): Promise<"failed"> {
  const { error } = await supabase.rpc("complete_preview_job", {
    p_item_id: job.item_id,
    p_status: "failed",
    p_error_code: errorCode,
  });
  if (error) {
    logEvent({
      event: "preview.failed",
      status: "failure",
      errorClass: error.code,
      entityId: job.item_id,
      userId,
    });
  }
  return "failed";
}

async function completeReady(
  supabase: SupabaseServerClient,
  userId: string,
  job: { item_id: string; url: string },
  outcome: Extract<EnrichOutcome, { status: "ready" }>,
) {
  let thumbnailHash: string | null = null;
  let faviconHash: string | null = null;

  if (outcome.thumbnail) {
    const key = previewObjectKey(
      userId,
      job.item_id,
      "thumb",
      outcome.thumbnail.sha256,
    );
    try {
      await putPreviewObject(supabase, key, outcome.thumbnail.bytes);
      thumbnailHash = outcome.thumbnail.sha256;
    } catch {
      // A thumbnail that enrichOne successfully produced but that failed
      // to upload must NOT be recorded as `ready` -- that would silently
      // drop the thumbnail for 30 days with no retry (`isPermanent`
      // treats `storage_failed` as transient on purpose). Fail the whole
      // job instead so the standard retry/backoff schedule picks it up.
      logEvent({
        event: "preview.failed",
        status: "failure",
        errorClass: "storage_failed",
        entityId: job.item_id,
        userId,
      });
      return completeFailed(supabase, userId, job, "storage_failed");
    }
  }

  if (outcome.favicon) {
    const key = previewObjectKey(
      userId,
      job.item_id,
      "icon",
      outcome.favicon.sha256,
    );
    try {
      await putPreviewObject(supabase, key, outcome.favicon.bytes);
      faviconHash = outcome.favicon.sha256;
    } catch {
      // Favicon storage failure is best-effort, mirroring enrichOne's own
      // "favicon never fails the job" rule -- keep faviconHash null.
    }
  }

  const { data, error } = await supabase.rpc("complete_preview_job", {
    p_item_id: job.item_id,
    p_status: "ready",
    p_remote_title: outcome.title,
    p_remote_description: outcome.description,
    p_site_name: outcome.siteName,
    p_thumbnail_hash: thumbnailHash,
    p_thumbnail_width: thumbnailHash ? outcome.thumbnail?.width : null,
    p_thumbnail_height: thumbnailHash ? outcome.thumbnail?.height : null,
    p_thumbnail_source: thumbnailHash ? outcome.thumbnailSource : "none",
    p_favicon_hash: faviconHash,
    // PostgreSQL routine parameters accept null; generated RPC args lose that metadata.
  } as unknown as Database["public"]["Functions"]["complete_preview_job"]["Args"]);

  if (error) {
    logEvent({
      event: "preview.failed",
      status: "failure",
      errorClass: error.code,
      entityId: job.item_id,
      userId,
    });
    return "failed" as const;
  }

  const previous = data?.[0];
  if (
    previous?.previous_thumbnail_hash &&
    previous.previous_thumbnail_hash !== thumbnailHash
  ) {
    await bestEffortRemove(
      supabase,
      previewObjectKey(
        userId,
        job.item_id,
        "thumb",
        previous.previous_thumbnail_hash,
      ),
      job.item_id,
      userId,
    );
  }
  if (
    previous?.previous_favicon_hash &&
    previous.previous_favicon_hash !== faviconHash
  ) {
    await bestEffortRemove(
      supabase,
      previewObjectKey(
        userId,
        job.item_id,
        "icon",
        previous.previous_favicon_hash,
      ),
      job.item_id,
      userId,
    );
  }

  return "ready" as const;
}

/**
 * One job's full lifecycle, wrapped by `processJob` in a try/catch: even
 * though `enrichOne` documents that it never throws, a single job must
 * never be able to take down the rest of its `Promise.all` chunk (plan
 * §7.5 test list: "falha de enrichOne em um job não impede os outros").
 */
async function runJob(
  supabase: SupabaseServerClient,
  userId: string,
  job: { item_id: string; url: string; attempts: number },
): Promise<"ready" | "failed"> {
  const startedAt = Date.now();
  const outcome = await enrichOne({ itemId: job.item_id, url: job.url });

  if (outcome.status === "failed") {
    logJobFailure(
      outcome.errorCode,
      job.item_id,
      userId,
      Date.now() - startedAt,
    );

    return completeFailed(supabase, userId, job, outcome.errorCode);
  }

  const result = await completeReady(supabase, userId, job, outcome);
  if (result === "ready") {
    logEvent({
      event: "preview.success",
      status: "success",
      entityId: job.item_id,
      userId,
      durationMs: Date.now() - startedAt,
    });
  }
  return result;
}

async function processJob(
  supabase: SupabaseServerClient,
  userId: string,
  job: { item_id: string; url: string; attempts: number },
): Promise<"ready" | "failed"> {
  try {
    return await runJob(supabase, userId, job);
  } catch (error) {
    logEvent({
      event: "preview.failed",
      status: "failure",
      errorClass: error instanceof Error ? error.name : "UnknownError",
      entityId: job.item_id,
      userId,
    });
    // A claimed job MUST always end in a persisted state transition, even
    // when enrichOne/runJob breaks its own "never throws" contract --
    // otherwise the lease expires with status still 'pending' and attempts
    // never incremented, so the same job gets reclaimed and retried
    // forever -- indefinite reprocessing.
    return completeFailed(supabase, userId, job, "unknown");
  }
}

/** Claims up to `limit` (capped at 6) pending jobs and processes them 3-at-a-time. Safe to call with nothing pending (returns all zeros). Pass `itemIds` to scope the claim to a set of items (e.g. the current page); omit it to keep the old global sweep. */
export async function drainPreviewQueue(
  opts: { limit?: number; itemIds?: string[] } = {},
): Promise<
  ActionResult<{
    processed: number;
    ready: number;
    failed: number;
    /** `null` when count_claimable_preview_jobs itself errored -- an
     * unknown count must never be read as "queue empty" by the caller. */
    remaining: number | null;
  }>
> {
  // `itemIds` omitted -> scope stays null, preserving the global sweep an
  // older client bundle still relies on. `itemIds` present (even `[]`) ->
  // validated and passed through as an explicit scope.
  let scope: string[] | null = null;
  if (opts.itemIds !== undefined) {
    const parsedScope = previewScopeSchema.safeParse(opts.itemIds);
    if (!parsedScope.success) {
      return fail("VALIDATION_FAILED", "Escopo de prévias inválido.");
    }
    scope = parsedScope.data;
  }

  const user = await requireUser();
  const supabase = await createClient();

  // Enforced here too, so a caller passing a larger `limit` never even
  // reaches the network call under a false impression.
  const limit = Math.min(
    Math.max(opts.limit ?? PREVIEW_CLAIM_LIMIT, 1),
    PREVIEW_CLAIM_LIMIT,
  );

  const claimStartedAt = Date.now();
  const { data: jobs, error: claimError } = await supabase.rpc(
    "claim_preview_jobs",
    {
      p_limit: limit,
      p_item_ids: scope,
      // PostgreSQL routine parameters accept null; generated RPC args lose that metadata.
    } as unknown as Database["public"]["Functions"]["claim_preview_jobs"]["Args"],
  );

  if (claimError) {
    logEvent({
      event: "preview.claimed",
      status: "failure",
      errorClass: claimError.code,
      userId: user.id,
      durationMs: Date.now() - claimStartedAt,
    });
    return fail("UNKNOWN", "Não foi possível buscar jobs de preview.");
  }

  logEvent({
    event: "preview.claimed",
    status: "pending",
    userId: user.id,
    durationMs: Date.now() - claimStartedAt,
  });

  const drainStartedAt = Date.now();
  const outcomes = await processInChunks(jobs ?? [], DRAIN_CONCURRENCY, (job) =>
    processJob(supabase, user.id, job),
  );

  // Mirrors claim_preview_jobs's own eligibility rule via the
  // count_claimable_preview_jobs RPC (not a `pending`-only filter here) --
  // otherwise overdue `ready`/transient-exhausted `failed` rows beyond a
  // single batch would look like there's nothing left to drain.
  const { data: remainingCount, error: countError } = await supabase.rpc(
    "count_claimable_preview_jobs",
    {
      p_item_ids: scope,
      // PostgreSQL routine parameters accept null; generated RPC args lose that metadata.
    } as unknown as Database["public"]["Functions"]["count_claimable_preview_jobs"]["Args"],
  );

  if (countError) {
    // Never let "couldn't count" collapse into `remaining: 0` -- that would
    // read as "queue empty" to usePreviewDrain and stop it prematurely while
    // jobs may still be eligible.
    logEvent({
      event: "preview.count_failed",
      status: "failure",
      errorClass: countError.code,
      userId: user.id,
    });
  }

  logEvent({
    event: "preview.drain",
    status: "success",
    userId: user.id,
    durationMs: Date.now() - drainStartedAt,
  });

  return ok({
    processed: outcomes.length,
    ready: outcomes.filter((outcome) => outcome === "ready").length,
    failed: outcomes.filter((outcome) => outcome === "failed").length,
    remaining: countError ? null : (remainingCount ?? 0),
  });
}

/** Manual "refresh preview" action, consumed by the item card's UI. */
export async function refreshItemPreview(
  itemId: string,
): Promise<ActionResult<null>> {
  const parsed = itemIdSchema.safeParse(itemId);
  if (!parsed.success) return fail("VALIDATION_FAILED", "Item inválido.");

  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.rpc("request_preview_refresh", {
    p_item_id: parsed.data,
  });

  if (error) {
    logEvent({
      event: "preview.refresh_failed",
      status: "failure",
      errorClass: error.code,
      userId: user.id,
      entityId: parsed.data,
    });
    return mapRefreshError(error);
  }

  // Mirrors lib/actions/items.ts's revalidateLibrary() pattern: the row
  // just flipped to `pending` server-side, and without this the page's
  // stale `items` payload never sees it, so the pending state never shows
  // and the refresh sits queued until a hard reload.
  revalidatePath("/library");

  return ok(null);
}

/** Botão "Atualizar pré-visualizações": reagenda as prévias não-`ready` da
 * página visível e devolve quantas voltaram para a fila. A drenagem em si
 * é o `drainPreviewQueue` escopado que o cliente chama logo depois. */
export async function reschedulePreviewsForItems(
  itemIds: string[],
): Promise<ActionResult<{ rescheduled: number }>> {
  const parsed = previewScopeSchema.safeParse(itemIds);
  if (!parsed.success) {
    return fail("VALIDATION_FAILED", "Escopo de prévias inválido.");
  }

  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "request_preview_reschedule_for_items",
    { p_item_ids: parsed.data },
  );

  if (error) {
    logEvent({
      event: "preview.reschedule_failed",
      status: "failure",
      errorClass: error.code,
      userId: user.id,
    });
    return fail("UNKNOWN", "Não foi possível atualizar as prévias.");
  }

  return ok({ rescheduled: data ?? 0 });
}
