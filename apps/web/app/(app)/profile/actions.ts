"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateProfileInput } from "@nextgen/contracts";

export type UpdateProfileResult = { ok: true } | { ok: false; error: string };

export async function updateProfile(formData: FormData): Promise<UpdateProfileResult> {
  const parsed = updateProfileInput.safeParse({
    fullName: formData.get("fullName") || undefined,
    backupEmail: String(formData.get("backupEmail") ?? "") || null,
    phone: String(formData.get("phone") ?? "") || null,
    locale: formData.get("locale") || undefined,
    avatarUrl: String(formData.get("avatarUrl") ?? "") || null,
  });
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nao autenticado." };

  const patch: {
    full_name?: string;
    backup_email?: string | null;
    phone?: string | null;
    locale?: string;
    avatar_url?: string | null;
  } = {};
  if (parsed.data.fullName !== undefined) patch.full_name = parsed.data.fullName;
  if (parsed.data.backupEmail !== undefined) patch.backup_email = parsed.data.backupEmail;
  if (parsed.data.phone !== undefined) patch.phone = parsed.data.phone;
  if (parsed.data.locale !== undefined) patch.locale = parsed.data.locale;
  if (parsed.data.avatarUrl !== undefined) patch.avatar_url = parsed.data.avatarUrl;

  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/profile");
  return { ok: true };
}
