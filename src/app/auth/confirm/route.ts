import { NextRequest, NextResponse } from "next/server";
import { authClient } from "@/lib/auth";
export async function GET(request: NextRequest) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const client = await authClient();
    const result = await client.auth.exchangeCodeForSession(code);
    if (!result.error)
      return NextResponse.redirect(new URL("/account", origin));
  }
  return NextResponse.redirect(new URL("/account?confirmation=failed", origin));
}
