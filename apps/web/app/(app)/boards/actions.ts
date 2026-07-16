"use server";

import { revalidateHomeProjects, revalidateBoard, revalidateOrgSettings } from "@/lib/revalidation";
import { rateLimitAction } from "@/lib/rate-limit";
import { sanitizeName } from "@/lib/sanitize";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_ORG_COOKIE } from "@/lib/active-org";
import { createBoardInput, updateBoardAppearanceInput, updateBoardSettingsInput, deleteBoardInput } from "@nextgen/contracts";
import type { Database } from "@nextgen/contracts";
import { canCreateInDepartment } from "@/lib/department-roles";
import { isOrgAdminRole } from "@/lib/org-member-roles";
import { getActiveOrgId } from "@/lib/active-org";
import { mapTifluxApiErrorForSettings, validateTifluxApiToken } from "@/lib/tiflux-api";

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
  const slug = slugify(name);
  const { data: org, error: orgError } = await supabase.rpc("create_organization", {
    p_name: name,
    p_slug: slug,
    p_legal_name: name,
    p_cnpj: null,
  });
  if (orgError || !org?.id) {
    throw new Error(orgError?.message ?? "Nao foi possivel criar a organizacao.");
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (org.id) {
    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_ORG_COOKIE, org.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  revalidateHomeProjects(user?.id);
}

export async function createBoard(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = createBoardInput.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    icon: formData.get("icon") || undefined,
    color: formData.get("color") || undefined,
    orgId: formData.get("orgId") || undefined,
    departmentId:
      formData.get("departmentId") === "" || formData.get("departmentId") === "general"
        ? null
        : formData.get("departmentId") || undefined,
  });
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nao autenticado." };

  const rl = await rateLimitAction(user.id, "createBoard", 20, 60_000);
  if (!rl.ok) return { ok: false, error: "Muitas requisicoes. Aguarde alguns segundos." };

  const targetOrgId = parsed.data.orgId ?? (await getActiveOrgId());
  if (!targetOrgId) return { ok: false, error: "Selecione uma organizacao." };

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("org_id", targetOrgId)
    .eq("user_id", user.id)
    .maybeSingle();

  const deptId = parsed.data.departmentId ?? null;
  let deptRole: string | null = null;
  if (deptId) {
    const { data: dm } = await supabase
      .from("department_members")
      .select("role")
      .eq("department_id", deptId)
      .eq("user_id", user.id)
      .maybeSingle();
    deptRole = dm?.role ?? null;
  }

  const isOwner = membership?.role === "owner";
  if (!canCreateInDepartment(membership?.role, deptRole, isOwner)) {
    return { ok: false, error: "Sem permissao para criar projetos neste escopo." };
  }

  const { error } = await supabase.from("boards").insert({
    org_id: targetOrgId,
    name: sanitizeName(parsed.data.name, 120),
    description: parsed.data.description ? sanitizeName(parsed.data.description, 2000) : null,
    icon: parsed.data.icon ?? null,
    color: parsed.data.color ?? null,
    department_id: deptId,
    created_by: user.id,
  });
  if (error) return { ok: false, error: "Nao foi possivel criar o projeto." };

  revalidateHomeProjects(user.id);
  revalidateOrgSettings(targetOrgId, user.id);
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase
    .from("boards")
    .update({ icon: parsed.data.icon ?? null, color: parsed.data.color ?? null })
    .eq("id", parsed.data.boardId);

  revalidateHomeProjects(user?.id);
  revalidateBoard(parsed.data.boardId, { userId: user?.id });
}

export type BoardSettingsResult = { ok: true } | { error: string };

export async function getBoardTifluxStatusAction(
  boardId: string,
): Promise<{ configured: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { configured: false };

  const { data, error } = await supabase.rpc("board_tiflux_status", { p_board: boardId });
  if (error) return { configured: false };
  return { configured: Boolean(data) };
}

function mapTifluxTokenRpcError(message: string): string {
  if (message.includes("forbidden")) return "Sem permissao para configurar Tiflux.";
  if (message.includes("invalid_token")) return "Codigo de API invalido (minimo 8 caracteres).";
  if (message.includes("not_authenticated")) return "Nao autenticado.";
  return "Nao foi possivel salvar o codigo de API do Tiflux.";
}

export async function updateBoardSettings(formData: FormData): Promise<BoardSettingsResult> {
  const tokenRaw = String(formData.get("tifluxApiToken") ?? "").trim();

  const parsed = updateBoardSettingsInput.safeParse({
    boardId: formData.get("boardId"),
    name: formData.get("name") || undefined,
    description: formData.has("description") ? formData.get("description") || null : undefined,
    icon: formData.has("icon") ? formData.get("icon") || null : undefined,
    color: formData.has("color") ? formData.get("color") || null : undefined,
    archived: formData.has("archived") ? formData.get("archived") === "true" : undefined,
    tifluxEnabled: formData.has("tifluxEnabled") ? formData.get("tifluxEnabled") === "true" : undefined,
    tifluxApiToken: tokenRaw.length > 0 ? tokenRaw : undefined,
  });
  if (!parsed.success) return { error: "Dados invalidos." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nao autenticado." };

  const boardId = parsed.data.boardId;

  if (parsed.data.tifluxEnabled === false) {
    const { error: clearErr } = await supabase.rpc("clear_board_tiflux_token", { p_board: boardId });
    if (clearErr) return { error: "Nao foi possivel desvincular o Tiflux." };
  } else if (parsed.data.tifluxEnabled === true) {
    const { data: configured, error: statusErr } = await supabase.rpc("board_tiflux_status", {
      p_board: boardId,
    });
    if (statusErr) return { error: "Nao foi possivel verificar integracao Tiflux." };

    const token = parsed.data.tifluxApiToken;
    if (!token && !configured) {
      return { error: "Informe o codigo de API do Tiflux." };
    }
    if (token) {
      if (process.env.TIFLUX_SKIP_TOKEN_VALIDATION !== "true") {
        try {
          await validateTifluxApiToken(token);
        } catch (err) {
          return { error: mapTifluxApiErrorForSettings(err) };
        }
      }
      const { error: setErr } = await supabase.rpc("set_board_tiflux_token", {
        p_board: boardId,
        p_token: token,
        p_api_url: null,
      });
      if (setErr) return { error: mapTifluxTokenRpcError(setErr.message) };
    }
  }

  const patch: Database["public"]["Tables"]["boards"]["Update"] = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.description !== undefined) patch.description = parsed.data.description;
  if (parsed.data.icon !== undefined) patch.icon = parsed.data.icon;
  if (parsed.data.color !== undefined) patch.color = parsed.data.color;
  if (parsed.data.archived !== undefined) patch.archived = parsed.data.archived;
  if (parsed.data.tifluxEnabled !== undefined) patch.tiflux_enabled = parsed.data.tifluxEnabled;

  const { error } = await supabase.from("boards").update(patch).eq("id", boardId);
  if (error) return { error: "Nao foi possivel salvar as configuracoes." };

  revalidateHomeProjects(user.id);
  revalidateBoard(boardId, { userId: user.id });
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

  revalidateHomeProjects(user.id);
  return { ok: true };
}
