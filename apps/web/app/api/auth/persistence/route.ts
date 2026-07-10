import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import {
  AUTH_PERSIST_COOKIE,
  authPersistCookieOptions,
} from "@/lib/supabase/auth-cookies";

const persistenceInput = z.object({ rememberMe: z.boolean() }).strict();

const PERSISTENCE_RATE_LIMIT = 20;
const PERSISTENCE_WINDOW_MS = 60_000;

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
    `auth-persistence:${getClientIp(request)}`,
    PERSISTENCE_RATE_LIMIT,
    PERSISTENCE_WINDOW_MS,
  );
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSec) } },
    );
  }

  const parsed = persistenceInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const response = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
  response.cookies.set(
    AUTH_PERSIST_COOKIE,
    parsed.data.rememberMe ? "1" : "0",
    authPersistCookieOptions(parsed.data.rememberMe),
  );
  return response;
}
