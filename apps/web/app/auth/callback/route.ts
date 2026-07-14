import { NextResponse } from "next/server";
import { getConfiguredAppUrl } from "@/lib/app-url";
import { createClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/safe-internal-path";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeInternalPath(searchParams.get("next"));
  const appUrl = getConfiguredAppUrl();

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${appUrl}${next}`);
    }
  }

  return NextResponse.redirect(`${appUrl}/login?error=callback`);
}
