// Content-Security-Policy for every page. Production allows no eval: the few
// eval-like lines in the client bundle are old-browser fallbacks that never run
// here, and zod checks for eval and quietly uses its non-eval path. The local
// dev server keeps 'unsafe-eval' because Next.js hot reload needs it.
export function contentSecurityPolicy(dev: boolean) {
  const script = ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : [])];
  return [
    "default-src 'self'",
    `script-src ${script.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co",
    "font-src 'self' data: blob:",
    "connect-src 'self' https://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}
