"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createBoardInput, updateBoardAppearanceInput } from "@nextgen/contracts";

function slugify(value: string): string {
  const base = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  return (base || "org") + "-" + Math.random().toString(36).slice(2, 6);
}

export async function createOrganization(formData: FormData): Promise<void> {
  const name = String(formData.get("orgName") ?? "").trim();
  if (!name) return;
  const supabase = await createClient();
  await supabase.rpc("create_organization", { p_name: name, p_slug: slugify(name) });
  revalidatePath("/boards");
}

export async function createBoard(formData: FormData): Promise<void> {
  const parsed = createBoardInput.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    icon: formData.get("icon") || undefined,
    color: formData.get("color") || undefined,
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: memberships } = await supabase.from("memberships").select("org_id").limit(1);
  const orgId = memberships?.[0]?.org_id;
  if (!orgId) return;

  await supabase.from("boards").insert({
    org_id: orgId,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    icon: parsed.data.icon ?? null,
    color: parsed.data.color ?? null,
    created_by: user.id,
  });
  revalidatePath("/boards");
}

export async function updateBoardAppearance(formData: FormData): Promise<void> {
  const parsed = updateBoardAppearanceInput.safeParse({
    boardId: formData.get("boardId"),
    icon: formData.get("icon") || null,
    color: formData.get("color") || null,
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase
    .from("boards")
    .update({ icon: parsed.data.icon ?? null, color: parsed.data.color ?? null })
    .eq("id", parsed.data.boardId);

  revalidatePath("/boards");
  revalidatePath(`/boards/${parsed.data.boardId}`);
}
