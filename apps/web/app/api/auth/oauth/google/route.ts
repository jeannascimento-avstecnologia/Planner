import { NextResponse } from "next/server";
import { getOAuthLoginRedirectUrl } from "@/lib/auth-oauth-start";
import { safeInternalPath } from "@/lib/safe-internal-path";

function loginErrorRedirect(request: Request, error: string): NextResponse {
  const { origin } = new URL(request.url);
  const message = error === "callback" ? "callback" : encodeURIComponent(error);
  return NextResponse.redirect(`${origin}/login?error=${message}`);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const next = safeInternalPath(searchParams.get("next"), "");
  const result = await getOAuthLoginRedirectUrl("google", next);
  if ("error" in result) return loginErrorRedirect(request, result.error);
  return NextResponse.redirect(result.url);
}
