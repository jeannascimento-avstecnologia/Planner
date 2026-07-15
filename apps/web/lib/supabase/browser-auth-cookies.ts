import type { CookieMethodsBrowser, CookieOptions } from "@supabase/ssr";

export function parseBrowserCookies(rawCookie: string): { name: string; value: string }[] {
  return rawCookie
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((part) => {
      const separator = part.indexOf("=");
      if (separator <= 0) return [];
      const name = part.slice(0, separator);
      const value = part.slice(separator + 1);
      return [{ name, value }];
    });
}

/** Serializa cookie no browser removendo persistencia positiva, mas preservando remocao. */
export function serializeSessionCookie(
  name: string,
  value: string,
  options: CookieOptions,
): string {
  const parts = [`${name}=${value}`];
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.domain) parts.push(`Domain=${options.domain}`);
  if (options.maxAge === 0) parts.push("Max-Age=0");
  if (options.sameSite) {
    const sameSite = options.sameSite === true ? "Strict" : options.sameSite;
    parts.push(`SameSite=${sameSite.charAt(0).toUpperCase()}${sameSite.slice(1)}`);
  }
  if (options.secure) parts.push("Secure");
  return parts.join("; ");
}

/** Remove cookies Supabase Auth (todas instancias: local 127, Cloud, chunks). */
export function clearSupabaseAuthCookies(): void {
  if (typeof document === "undefined") return;
  for (const { name } of parseBrowserCookies(document.cookie)) {
    if (/^sb-.+-auth-token/.test(name)) {
      document.cookie = serializeSessionCookie(name, "", { path: "/", maxAge: 0 });
    }
  }
}

/** Storage Supabase que cria cookies de sessao desde a primeira escrita. */
export function sessionOnlyCookieMethods(): CookieMethodsBrowser {
  return {
    getAll: () => parseBrowserCookies(document.cookie),
    setAll: (cookiesToSet) => {
      cookiesToSet.forEach(({ name, value, options }) => {
        document.cookie = serializeSessionCookie(name, value, options);
      });
    },
  };
}
