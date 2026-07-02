/** Content-Security-Policy para respostas HTML do Next.js (App Router). */

function supabaseOrigins(): string[] {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return [];
  try {
    const url = new URL(raw);
    const ws = url.protocol === "https:" ? `wss://${url.host}` : `ws://${url.host}`;
    return [url.origin, ws];
  } catch {
    return [];
  }
}

function appPublicUrlIsHttps(): boolean {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim().toLowerCase();
  if (!raw) return false;
  return raw.startsWith("https://");
}

export function buildContentSecurityPolicy(isDev: boolean): string {
  const supabaseOriginList = supabaseOrigins().filter((origin) => origin.startsWith("http"));

  const connectSrc = [
    "'self'",
    ...supabaseOrigins(),
    "https://api.cloudinary.com",
    ...(isDev ? ["http://127.0.0.1:*", "http://localhost:*", "ws://127.0.0.1:*", "ws://localhost:*"] : []),
  ];

  const imgSrc = [
    "'self'",
    "data:",
    "blob:",
    "https://res.cloudinary.com",
    "https://*.cloudinary.com",
    ...supabaseOriginList,
    ...(isDev ? ["http://127.0.0.1:*", "http://localhost:*"] : []),
    "https:",
  ];

  const directives = [
    "default-src 'self'",
    // Next.js + ThemeScript inline no head
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imgSrc.join(" ")}`,
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(" ")}`,
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ];

  if (!isDev && appPublicUrlIsHttps()) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

export function securityHeaders(isDev: boolean): { key: string; value: string }[] {
  const headers: { key: string; value: string }[] = [
    { key: "Content-Security-Policy", value: buildContentSecurityPolicy(isDev) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=()",
    },
  ];

  if (!isDev && appPublicUrlIsHttps()) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains",
    });
  }

  return headers;
}
