export function oauthLoginStartPath(provider: "google" | "microsoft", next: string): string {
  const params = new URLSearchParams();
  if (next) params.set("next", next);
  const qs = params.toString();
  return `/api/auth/oauth/${provider}${qs ? `?${qs}` : ""}`;
}
