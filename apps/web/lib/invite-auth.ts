export function isInviteAuthNext(next: string | null | undefined): boolean {
  if (!next || !next.startsWith("/invite?")) return false;
  return next.includes("token=");
}

export function parseInviteTokenFromNext(next: string): string | null {
  if (!isInviteAuthNext(next)) return null;
  const query = next.slice("/invite?".length);
  const params = new URLSearchParams(query);
  const token = params.get("token")?.trim();
  return token || null;
}
