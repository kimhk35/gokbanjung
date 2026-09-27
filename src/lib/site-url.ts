// NEXT_PUBLIC_SITE_URL is optional. Browsers cannot forge Host/X-Forwarded-Host
// on cross-site requests, so the forwarded host is a safe CSRF reference.
type Env = Record<string, string | undefined>;
export function siteOrigin(headers: Headers, requestUrl: string, env: Env = process.env) {
  const explicit = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return new URL(explicit).origin;
  const host = headers.get("x-forwarded-host") || headers.get("host");
  if (host) {
    const proto = headers.get("x-forwarded-proto") || new URL(requestUrl).protocol.replace(":", "");
    return `${proto}://${host}`;
  }
  return new URL(requestUrl).origin;
}
export function sameOrigin(headers: Headers, requestUrl: string, env: Env = process.env) {
  const origin = headers.get("origin");
  return !!origin && origin === siteOrigin(headers, requestUrl, env);
}
