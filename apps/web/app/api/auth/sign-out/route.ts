import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { AUTH_PERSIST_COOKIE } from "@/lib/supabase/auth-cookies";

const SIGN_OUT_RATE_LIMIT = 20;
const SIGN_OUT_WINDOW_MS = 60_000;

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const received = new URL(origin);
    const configured = process.env.NEXT_PUBLIC_APP_URL
      ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin
      : null;
    if (configured && received.origin === configured) return true;
    if (process.env.NODE_ENV !== "production") {
      const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
      const requestHost = forwardedHost || request.headers.get("host");
      return Boolean(requestHost && received.host === requestHost);
    }
    return false;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "origin_not_allowed" }, { status: 403 });
  }

  const rateLimit = checkRateLimit(
    `auth-sign-out:${getClientIp(request)}`,
    SIGN_OUT_RATE_LIMIT,
    SIGN_OUT_WINDOW_MS,
  );
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSec) } },
    );
  }

  const supabase = await createClient();
  const { error: signOutError } = await supabase.auth.signOut();

  const response = NextResponse.json(
    { ok: true, signOutError: signOutError?.message ?? null },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
  response.cookies.set(AUTH_PERSIST_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
