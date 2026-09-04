/**
 * Centralized structured logger.
 * Field allowlist by construction: there is no way to pass an arbitrary
 * "details" blob, so request bodies, prompt content or raw HTML can't
 * reach a log line through this module.
 */

export type LogStatus = "success" | "failure" | "pending";

export type LogEvent = {
  /** Stable event name, e.g. "auth.login_failed", "item.create_failed". */
  event: string;
  requestId?: string;
  status?: LogStatus;
  entityId?: string;
  durationMs?: number;
  errorClass?: string;
  /** Opaque user identifier (UUID), never an email. */
  userId?: string;
};

const JWT_PATTERN = /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g;
const EMAIL_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/g;

/** Redacts JWT-shaped tokens and email addresses from a free-form string. */
export function redact(value: string): string {
  return value
    .replace(JWT_PATTERN, "[redacted-token]")
    .replace(EMAIL_PATTERN, "[redacted-email]");
}

function currentEnvironment(): string {
  return process.env.NODE_ENV ?? "unknown";
}

/**
 * Emits one structured JSON log line to stdout. Only allowlisted fields are
 * accepted; string fields are redacted defensively even though callers
 * should never pass tokens/emails/prompt content here in the first place.
 */
export function logEvent(fields: LogEvent): void {
  const payload: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    environment: currentEnvironment(),
    event: redact(fields.event),
  };

  if (fields.requestId) payload.requestId = fields.requestId;
  if (fields.status) payload.status = fields.status;
  if (fields.entityId) payload.entityId = redact(fields.entityId);
  if (typeof fields.durationMs === "number")
    payload.durationMs = fields.durationMs;
  if (fields.errorClass) payload.errorClass = redact(fields.errorClass);
  if (fields.userId) payload.userId = fields.userId;

  console.log(JSON.stringify(payload));
}
