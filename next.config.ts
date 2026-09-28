import type { NextConfig } from "next";
import { contentSecurityPolicy } from "./src/lib/security-headers";
// Shown in the footer as "최근 업데이트" (Korea date of this build).
const buildDate = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
const config: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_DATE: buildDate },
  distDir: process.env.NEXT_DIST_DIR || ".next",
  serverExternalPackages: [
    "@electric-sql/pglite",
    "pdf-parse",
    "kordoc",
    "pdfjs-dist",
  ],
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
            // CSP_STRICT=1 runs the dev server with the production policy
            // (to check a change never needs eval).
            value: contentSecurityPolicy(
              process.env.NODE_ENV === "development" &&
                process.env.CSP_STRICT !== "1",
            ),
          },
        ],
      },
    ];
  },
};
export default config;
