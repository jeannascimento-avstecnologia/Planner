import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@nextgen/contracts";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function uploadOrgLogoToStorage(
  supabase: SupabaseClient<Database>,
  orgId: string,
  file: File,
): Promise<string> {
  if (!file.type.startsWith("image/") || !ALLOWED_TYPES.has(file.type)) {
    throw new Error("Selecione uma imagem JPG, PNG, WebP ou GIF.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("A imagem deve ter no maximo 5 MB.");
  }

  const extByType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  const ext = extByType[file.type] ?? "png";
  const path = `${orgId}/${crypto.randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from("org-logos").upload(path, bytes, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("org-logos").getPublicUrl(path);
  return data.publicUrl;
}
