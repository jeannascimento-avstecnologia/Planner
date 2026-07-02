/** Reescreve URL publica do Supabase Storage para rota same-origin (CSP img-src 'self'). */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILE_RE = /^[\w-]+\.(jpg|jpeg|png|webp|gif)$/i;

function isValidOrgLogoStoragePath(storagePath: string): boolean {
  const parts = storagePath.split("/");
  if (parts.length !== 2) return false;
  const [orgId, fileName] = parts;
  return Boolean(orgId && fileName && UUID_RE.test(orgId) && FILE_RE.test(fileName));
}

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
      if (storagePath && isValidOrgLogoStoragePath(storagePath)) {
        return `/api/org-logos/${storagePath}`;
      }
    }
  } catch {
    // mantem URL original (Cloudinary, etc.)
  }

  return raw;
}
