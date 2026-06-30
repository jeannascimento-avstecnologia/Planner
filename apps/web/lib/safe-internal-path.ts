/** Caminho interno seguro para redirects (bloqueia open redirect). */
export function safeInternalPath(raw: string | null | undefined, fallback = "/boards"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return fallback;
  }
  return raw;
}
