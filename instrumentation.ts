/**
 * Runs once when the server starts (Next.js instrumentation hook).
 * Validates required environment variables and fails the process instead
 * of booting with an incomplete configuration.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getEnv } = await import("@/lib/validation/env");
    getEnv();
  }
}
