/**
 * Standard mutation result shape. Server Actions and RPC
 * wrappers return this instead of throwing, so the client never sees a raw
 * exception, stack trace or SQL error.
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      code: AppErrorCode;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(
  code: AppErrorCode,
  message: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<never> {
  return { ok: false, code, message, fieldErrors };
}

/**
 * Stable application error codes. Never derived from a raw Postgres
 * constraint/message, so a schema rename can't leak into client-facing text.
 */
export type AppErrorCode =
  | "DUPLICATE"
  | "INVALID_REFERENCE"
  | "CONSTRAINT_VIOLATION"
  | "MISSING_REQUIRED_FIELD"
  | "FORBIDDEN"
  | "VALIDATION_FAILED"
  | "NOT_FOUND"
  | "UNKNOWN";

/** Subset of Postgres SQLSTATE codes this application maps explicitly. */
const POSTGRES_SQLSTATE = {
  UNIQUE_VIOLATION: "23505",
  FOREIGN_KEY_VIOLATION: "23503",
  CHECK_VIOLATION: "23514",
  NOT_NULL_VIOLATION: "23502",
  INSUFFICIENT_PRIVILEGE: "42501",
} as const;

/**
 * Maps a Postgres SQLSTATE to a stable application error code.
 * Unknown/undefined codes fall back to `UNKNOWN` — callers must fail
 * closed on that, never assume success.
 */
export function mapPostgresErrorCode(
  sqlState: string | undefined,
): AppErrorCode {
  switch (sqlState) {
    case POSTGRES_SQLSTATE.UNIQUE_VIOLATION:
      return "DUPLICATE";
    case POSTGRES_SQLSTATE.FOREIGN_KEY_VIOLATION:
      return "INVALID_REFERENCE";
    case POSTGRES_SQLSTATE.CHECK_VIOLATION:
      return "CONSTRAINT_VIOLATION";
    case POSTGRES_SQLSTATE.NOT_NULL_VIOLATION:
      return "MISSING_REQUIRED_FIELD";
    case POSTGRES_SQLSTATE.INSUFFICIENT_PRIVILEGE:
      return "FORBIDDEN";
    default:
      return "UNKNOWN";
  }
}
