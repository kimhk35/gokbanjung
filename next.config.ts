import type { NextConfig } from "next";
// Shown in the footer as "최근 업데이트" (Korea date of this build).
const buildDate = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
const config: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_DATE: buildDate },
  distDir: process.env.NEXT_DIST_DIR || ".next",
  serverExternalPackages: ["@electric-sql/pglite", "pdf-parse"],
  outputFileTracingIncludes: {
    "/api/*": ["./supabase/migrations/**/*.sql", "./supabase/seed.sql"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.supabase.co; font-src 'self' data: blob:; connect-src 'self' https://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
          },
        ],
      },
    ];
  },
};
export default config;
