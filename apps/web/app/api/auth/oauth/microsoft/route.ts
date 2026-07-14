import { NextResponse } from "next/server";
import { getConfiguredAppUrl } from "@/lib/app-url";
import { getOAuthLoginRedirectUrl } from "@/lib/auth-oauth-start";
import { safeInternalPath } from "@/lib/safe-internal-path";

function loginErrorRedirect(error: string): NextResponse {
  const appUrl = getConfiguredAppUrl();
  const message = error === "callback" ? "callback" : encodeURIComponent(error);
  return NextResponse.redirect(`${appUrl}/login?error=${message}`);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const next = safeInternalPath(searchParams.get("next"), "");
  const result = await getOAuthLoginRedirectUrl("azure", next);
  if ("error" in result) return loginErrorRedirect(result.error);
  return NextResponse.redirect(result.url);
}
