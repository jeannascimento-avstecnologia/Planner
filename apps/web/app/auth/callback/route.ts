import { NextResponse } from "next/server";
import { getConfiguredAppUrl } from "@/lib/app-url";
import { createClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/safe-internal-path";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeInternalPath(searchParams.get("next"));
  const appUrl = getConfiguredAppUrl();

  // #region agent log
  console.info(
    JSON.stringify({
      sessionId: "c84914",
      runId: "pre-fix",
      hypothesisId: "B",
      location: "auth/callback/route.ts:GET",
      message: "oauth callback hit",
      data: { hasCode: Boolean(code), appUrlHost: new URL(appUrl).host, next },
      timestamp: Date.now(),
    }),
  );
  // #endregion

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${appUrl}${next}`);
    }
    // #region agent log
    console.error(
      JSON.stringify({
        sessionId: "c84914",
        runId: "pre-fix",
        hypothesisId: "C",
        location: "auth/callback/route.ts:exchangeCodeForSession",
        message: "exchange failed",
        data: { errorMessage: error.message, errorStatus: error.status ?? null },
        timestamp: Date.now(),
      }),
    );
    // #endregion
  }

  return NextResponse.redirect(`${appUrl}/login?error=callback`);
}
