import type { CookieOptions } from "@supabase/ssr";

export const AUTH_PERSIST_COOKIE = "ngp:auth-persist";
export const AUTH_REMEMBER_MAX_AGE_SEC = 60 * 60 * 24 * 400;

const baseCookieOptions = (): Pick<CookieOptions, "httpOnly" | "sameSite" | "secure" | "path"> => ({
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
});

export function authPersistCookieOptions(rememberMe: boolean): CookieOptions {
  if (rememberMe) {
    return { ...baseCookieOptions(), maxAge: AUTH_REMEMBER_MAX_AGE_SEC };
  }
  return baseCookieOptions();
}

export function applyAuthSessionCookieOptions(
  cookieOpts: CookieOptions,
  sessionOnly: boolean,
): CookieOptions {
  if (!sessionOnly) {
    return { ...cookieOpts, maxAge: cookieOpts.maxAge ?? AUTH_REMEMBER_MAX_AGE_SEC };
  }
  return { ...cookieOpts, maxAge: undefined, expires: undefined };
}

export function isSessionOnlyAuth(requestCookies: {
  get(name: string): { value: string } | undefined;
}): boolean {
  return requestCookies.get(AUTH_PERSIST_COOKIE)?.value === "0";
}
