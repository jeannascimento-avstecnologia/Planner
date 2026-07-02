"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_ORG_COOKIE } from "@/lib/active-org";
import { createBoardInput, updateBoardAppearanceInput, updateBoardSettingsInput, deleteBoardInput } from "@nextgen/contracts";
import type { Database } from "@nextgen/contracts";
import { isOrgAdminRole } from "@/lib/org-member-roles";
import { getActiveOrgId } from "@/lib/active-org";

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
  const { data: org } = await supabase.rpc("create_organization", { p_name: name, p_slug: slugify(name) });
  if (org?.id) {
    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_ORG_COOKIE, org.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  revalidatePath("/boards");
  revalidatePath("/projects");
}

export async function createBoard(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = createBoardInput.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    icon: formData.get("icon") || undefined,
    color: formData.get("color") || undefined,
    orgId: formData.get("orgId") || undefined,
  });
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nao autenticado." };

  const targetOrgId = parsed.data.orgId ?? (await getActiveOrgId());
  if (!targetOrgId) return { ok: false, error: "Selecione uma organizacao." };

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("org_id", targetOrgId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!isOrgAdminRole(membership?.role)) {
    return { ok: false, error: "Sem permissao para criar projetos nesta organizacao." };
  }

  const { error } = await supabase.from("boards").insert({
    org_id: targetOrgId,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    icon: parsed.data.icon ?? null,
    color: parsed.data.color ?? null,
    created_by: user.id,
  });
  if (error) return { ok: false, error: "Nao foi possivel criar o projeto." };

  revalidatePath("/boards");
  revalidatePath("/projects");
  revalidatePath("/settings/organizations");
  return { ok: true };
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
  revalidatePath("/projects");
  revalidatePath(`/boards/${parsed.data.boardId}`);
}

export type BoardSettingsResult = { ok: true } | { error: string };

export async function updateBoardSettings(formData: FormData): Promise<BoardSettingsResult> {
  const parsed = updateBoardSettingsInput.safeParse({
    boardId: formData.get("boardId"),
    name: formData.get("name") || undefined,
    description: formData.has("description") ? formData.get("description") || null : undefined,
    icon: formData.has("icon") ? formData.get("icon") || null : undefined,
    color: formData.has("color") ? formData.get("color") || null : undefined,
    archived: formData.has("archived") ? formData.get("archived") === "true" : undefined,
    tifluxEnabled: formData.has("tifluxEnabled") ? formData.get("tifluxEnabled") === "true" : undefined,
  });
  if (!parsed.success) return { error: "Dados invalidos." };

  const supabase = await createClient();

  const patch: Database["public"]["Tables"]["boards"]["Update"] = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.description !== undefined) patch.description = parsed.data.description;
  if (parsed.data.icon !== undefined) patch.icon = parsed.data.icon;
  if (parsed.data.color !== undefined) patch.color = parsed.data.color;
  if (parsed.data.archived !== undefined) patch.archived = parsed.data.archived;
  if (parsed.data.tifluxEnabled !== undefined) patch.tiflux_enabled = parsed.data.tifluxEnabled;

  const { error } = await supabase.from("boards").update(patch).eq("id", parsed.data.boardId);
  if (error) return { error: "Nao foi possivel salvar as configuracoes." };

  revalidatePath("/boards");
  revalidatePath("/projects");
  revalidatePath(`/boards/${parsed.data.boardId}`);
  return { ok: true };
}

export async function deleteBoard(formData: FormData): Promise<BoardSettingsResult> {
  const parsed = deleteBoardInput.safeParse({ boardId: formData.get("boardId") });
  if (!parsed.success) return { error: "Dados invalidos." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nao autenticado." };

  const { data: board } = await supabase
    .from("boards")
    .select("org_id")
    .eq("id", parsed.data.boardId)
    .maybeSingle();
  if (!board) return { error: "Projeto nao encontrado." };

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("org_id", board.org_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!isOrgAdminRole(membership?.role)) {
    return { error: "Sem permissao para excluir este projeto." };
  }

  const { error } = await supabase.from("boards").delete().eq("id", parsed.data.boardId);
  if (error) return { error: "Nao foi possivel excluir o projeto." };

  revalidatePath("/boards");
  revalidatePath("/projects");
  return { ok: true };
}
