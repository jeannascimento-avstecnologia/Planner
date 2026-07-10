import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  AUTH_PERSIST_COOKIE,
  authPersistCookieOptions,
} from "@/lib/supabase/auth-cookies";

const persistenceInput = z.object({ rememberMe: z.boolean() }).strict();

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const received = new URL(origin);
    const configured = process.env.NEXT_PUBLIC_APP_URL
      ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin
      : null;
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const requestHost = forwardedHost || request.headers.get("host");
    return received.origin === configured || received.host === requestHost;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "origin_not_allowed" }, { status: 403 });
  }

  const parsed = persistenceInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
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
