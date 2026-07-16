import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@nextgen/contracts";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { applyAuthSessionCookieOptions, isSessionOnlyAuth } from "@/lib/supabase/auth-cookies";
import {
  DEADLINE_SYNC_COOKIE,
  DEADLINE_SYNC_INTERVAL_MS,
  PLANNER_SYNC_DEADLINES_HEADER,
  PLANNER_USER_EMAIL_HEADER,
  PLANNER_USER_ID_HEADER,
} from "@/lib/planner-headers";

const PROTECTED_PREFIXES = [
  "/boards",
  "/projects",
  "/calendar",
  "/plan",
  "/profile",
  "/settings",
  "/workload",
];

const HTTP_LIMIT_IP = 120;
const HTTP_LIMIT_USER = 60;
const HTTP_WINDOW_MS = 60_000;

function rateLimitResponse(retryAfterSec: number): NextResponse {
  return new NextResponse("Too Many Requests", {
    status: 429,
    headers: { "Retry-After": String(retryAfterSec) },
  });
}

function stripPlannerHeaders(headers: Headers): Headers {
  headers.delete(PLANNER_USER_ID_HEADER);
  headers.delete(PLANNER_USER_EMAIL_HEADER);
  headers.delete(PLANNER_SYNC_DEADLINES_HEADER);
  return headers;
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((c) => to.cookies.set(c.name, c.value));
}

export async function updateSession(request: NextRequest) {
  // Server Actions set auth cookies themselves; session refresh here can break the action stream.
  if (request.headers.get("next-action")) {
    return NextResponse.next();
  }

  const ip = getClientIp(request);
  const ipRl = await checkRateLimit(["ip", ip, "http"], HTTP_LIMIT_IP, HTTP_WINDOW_MS);
  if (!ipRl.ok) return rateLimitResponse(ipRl.retryAfterSec);

  const sessionOnly = isSessionOnlyAuth(request.cookies);
  const inboundHeaders = stripPlannerHeaders(new Headers(request.headers));

  let response = NextResponse.next({ request: { headers: inboundHeaders } });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: inboundHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, applyAuthSessionCookieOptions(options, sessionOnly)),
          );
        },
      },
    },
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  let sessionUser = user;
  if (
    authError &&
    (authError.code === "refresh_token_not_found" ||
      authError.message?.includes("Refresh Token"))
  ) {
    await supabase.auth.signOut();
    sessionUser = null;
  }

  if (sessionUser) {
    const userRl = await checkRateLimit(
      ["user", sessionUser.id, "http"],
      HTTP_LIMIT_USER,
      HTTP_WINDOW_MS,
    );
    if (!userRl.ok) return rateLimitResponse(userRl.retryAfterSec);
  }

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));

  if (!sessionUser && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (!sessionUser) return response;

  const outHeaders = stripPlannerHeaders(new Headers(request.headers));
  outHeaders.set(PLANNER_USER_ID_HEADER, sessionUser.id);

  let syncDeadlines = false;
  if (isProtected) {
    const lastRaw = request.cookies.get(DEADLINE_SYNC_COOKIE)?.value;
    const last = lastRaw ? Number(lastRaw) : 0;
    const now = Date.now();
    if (!last || now - last > DEADLINE_SYNC_INTERVAL_MS) {
      syncDeadlines = true;
      outHeaders.set(PLANNER_SYNC_DEADLINES_HEADER, "1");
    }
  }

  const nextResponse = NextResponse.next({ request: { headers: outHeaders } });
  copyCookies(response, nextResponse);
  if (syncDeadlines) {
    nextResponse.cookies.set(DEADLINE_SYNC_COOKIE, String(Date.now()), {
      maxAge: DEADLINE_SYNC_INTERVAL_MS / 1000,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }
  return nextResponse;
}
