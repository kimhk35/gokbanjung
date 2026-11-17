export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}
// Classify database failures without exposing SQL, addresses or parameters.
export function serverFailure(
  error: unknown,
): { status: number; code: string } | null {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  if (["42501", "23503", "23514", "P0001"].includes(code))
    return { status: 403, code: "forbidden" };
  // Missing tables, columns, functions or schemas mean an update was not applied.
  if (["42P01", "42703", "42883", "3F000"].includes(code))
    return { status: 503, code: "setup_required" };
  if (
    /^(08|57P)/.test(code) ||
    ["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN"].includes(code)
  )
    return { status: 503, code: "service_unavailable" };
  return null;
}
export function ensure(
  condition: unknown,
  status = 403,
  code = "forbidden",
): asserts condition {
  if (!condition) throw new AppError(status, code);
}
