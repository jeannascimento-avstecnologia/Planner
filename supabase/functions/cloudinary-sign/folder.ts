/** Folder scoping for cloudinary-sign — sempre sob `org/{orgId}/…`. */

export type UploadPurpose = "avatar" | "logo" | "upload" | "card";

export type SignBody = {
  orgId?: string;
  purpose?: string;
  cardId?: string;
  /** Rejeitado se presente — cliente não escolhe path livre. */
  folder?: string;
};

export type FolderOk = { ok: true; folder: string; purpose: UploadPurpose; requiresAdmin: boolean };
export type FolderErr = { ok: false; status: 400; error: string };
export type FolderResult = FolderOk | FolderErr;

const PURPOSES = new Set<string>(["avatar", "logo", "upload", "card"]);

export function parsePurpose(raw: string | undefined): UploadPurpose {
  if (raw && PURPOSES.has(raw)) return raw as UploadPurpose;
  return "upload";
}

/**
 * Resolve folder server-side. Ignora/rejeita `folder` do client.
 * Aceite P3.3: prefixo obrigatório `org/{orgId}/…`.
 */
export function resolveOrgUploadFolder(body: SignBody): FolderResult {
  if (body.folder !== undefined && body.folder !== null && String(body.folder).trim() !== "") {
    return { ok: false, status: 400, error: "folder_not_allowed" };
  }

  const orgId = body.orgId?.trim();
  if (!orgId) {
    return { ok: false, status: 400, error: "org_id_required" };
  }

  // UUID v4-ish guard (evita path traversal / lixo)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orgId)) {
    return { ok: false, status: 400, error: "org_id_invalid" };
  }

  const purpose = parsePurpose(body.purpose);

  if (purpose === "card") {
    const cardId = body.cardId?.trim();
    if (!cardId) return { ok: false, status: 400, error: "card_id_required" };
    if (!/^[0-9a-f-]{36}$/i.test(cardId)) {
      return { ok: false, status: 400, error: "card_id_invalid" };
    }
    return {
      ok: true,
      folder: `org/${orgId}/card/${cardId}`,
      purpose,
      requiresAdmin: false,
    };
  }

  if (purpose === "logo") {
    return { ok: true, folder: `org/${orgId}/logos`, purpose, requiresAdmin: true };
  }

  if (purpose === "avatar") {
    return { ok: true, folder: `org/${orgId}/avatars`, purpose, requiresAdmin: false };
  }

  return { ok: true, folder: `org/${orgId}/uploads`, purpose: "upload", requiresAdmin: false };
}

export function assertBearerPresent(authHeader: string | null): { ok: true } | { ok: false; status: 401; error: string } {
  if (!authHeader?.startsWith("Bearer ") || authHeader.length < 16) {
    return { ok: false, status: 401, error: "unauthorized" };
  }
  return { ok: true };
}
