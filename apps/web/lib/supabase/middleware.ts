import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@nextgen/contracts";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { applyAuthSessionCookieOptions, isSessionOnlyAuth } from "@/lib/supabase/auth-cookies";

const PROTECTED_PREFIXES = ["/boards", "/projects", "/calendar", "/profile", "/settings", "/workload"];

const HTTP_LIMIT_IP = 120;
const HTTP_LIMIT_USER = 60;
const HTTP_WINDOW_MS = 60_000;

function rateLimitResponse(retryAfterSec: number): NextResponse {
  return new NextResponse("Too Many Requests", {
    status: 429,
    headers: { "Retry-After": String(retryAfterSec) },
  });
}

export async function updateSession(request: NextRequest) {
  const ip = getClientIp(request);
  const ipRl = checkRateLimit(`http:ip:${ip}`, HTTP_LIMIT_IP, HTTP_WINDOW_MS);
  if (!ipRl.ok) return rateLimitResponse(ipRl.retryAfterSec);

  let response = NextResponse.next({ request });
  const sessionOnly = isSessionOnlyAuth(request.cookies);

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
          response = NextResponse.next({ request });
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
    const userRl = checkRateLimit(`http:user:${sessionUser.id}`, HTTP_LIMIT_USER, HTTP_WINDOW_MS);
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

  return response;
}
