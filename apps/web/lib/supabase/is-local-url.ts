/** Supabase CLI / Docker local (nao suporta OAuth Azure sem config extra). */
export function isLocalSupabaseUrl(urlRaw?: string | null): boolean {
  const url = urlRaw ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    return host === "127.0.0.1" || host === "localhost";
  } catch {
    return false;
  }
}

export function isMicrosoftLoginAvailable(urlRaw?: string | null): boolean {
  return !isLocalSupabaseUrl(urlRaw);
}

export const MICROSOFT_LOGIN_LOCAL_MESSAGE =
  "Login Microsoft requer Supabase Cloud com provider Azure habilitado. No dev local use admin@nextgen.dev ou aponte .env para Cloud.";
