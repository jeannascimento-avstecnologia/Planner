/** Reescreve URL publica do Supabase Storage para rota same-origin (CSP img-src 'self'). */
export function resolveOrgLogoDisplayUrl(logoUrl: string | null | undefined): string | null {
  const raw = logoUrl?.trim();
  if (!raw) return null;

  const supabaseBase = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!supabaseBase) return raw;

  const marker = "/storage/v1/object/public/org-logos/";
  try {
    const parsed = new URL(raw);
    const supabaseOrigin = new URL(supabaseBase).origin;
    if (parsed.origin === supabaseOrigin && parsed.pathname.includes(marker)) {
      const storagePath = decodeURIComponent(parsed.pathname.split(marker)[1] ?? "");
      if (storagePath && /^[\w-]+\/[\w-]+\.(jpg|jpeg|png|webp|gif)$/i.test(storagePath)) {
        return `/api/org-logos/${storagePath}`;
      }
    }
  } catch {
    // mantem URL original (Cloudinary, etc.)
  }

  return raw;
}
