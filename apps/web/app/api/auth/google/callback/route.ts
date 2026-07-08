import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  if (error) {
    return NextResponse.redirect(new URL(`/settings/integrations/google?google=error`, request.url));
  }
  if (!code) {
    return NextResponse.redirect(new URL(`/settings/integrations/google?google=missing`, request.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(new URL(`/settings/integrations/google?google=not_configured`, request.url));
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL(`/settings/integrations/google?google=token_failed`, request.url));
  }

  const tokenJson = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
  };

  const supabase = await createClient();
  const expiresAt = new Date(Date.now() + tokenJson.expires_in * 1000).toISOString();
  const { error: rpcError } = await supabase.rpc("set_user_google_tokens", {
    p_access: tokenJson.access_token,
    p_refresh: tokenJson.refresh_token ?? tokenJson.access_token,
    p_expires_at: expiresAt,
    p_scope: tokenJson.scope ?? null,
  });

  if (rpcError) {
    return NextResponse.redirect(new URL(`/settings/integrations/google?google=save_failed`, request.url));
  }

  return NextResponse.redirect(new URL(`/settings/integrations/google?google=connected`, request.url));
}
