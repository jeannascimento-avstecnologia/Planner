"use server";

import { revalidatePath } from "next/cache";
import {
  createAccessPresetInput,
  deleteAccessPresetInput,
  updateAccessPresetInput,
  assignBoardMemberPresetInput,
} from "@nextgen/contracts";
import { createClient } from "@/lib/supabase/server";
import { emitAuditEvent } from "@/lib/audit/emit-event";
import { canManageAccessPresets } from "@/lib/org-member-roles";
import { deriveBaseRoleFromCodes, type AccessPresetRow } from "@/lib/access-presets";
import { computeCanManageBoardMembers } from "@/lib/board-authz";
import { listAccessPresets } from "@/lib/load-access-presets";
import type { BoardPermissionCode } from "@nextgen/contracts";

type ActionResult = { ok: true } | { ok: false; error: string };

/** Presets sistema + custom da org do board (para invite/share UI). */
export async function listAccessPresetsForBoardAction(
  boardId: string,
): Promise<{ orgId: string | null; presets: AccessPresetRow[] }> {
  const supabase = await createClient();
  const { data: board } = await supabase.from("boards").select("org_id").eq("id", boardId).maybeSingle();
  if (!board?.org_id) return { orgId: null, presets: [] };
  const presets = await listAccessPresets(board.org_id);
  return { orgId: board.org_id, presets };
}

async function assertOrgOwner(orgId: string): Promise<ActionResult & { userId?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nao autenticado." };

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!canManageAccessPresets(membership?.role)) {
    return { ok: false, error: "Apenas o proprietario pode gerenciar presets de acesso." };
  }
  return { ok: true, userId: user.id };
}

export async function createAccessPresetAction(
  input: unknown,
): Promise<ActionResult & { id?: string }> {
  const parsed = createAccessPresetInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const gate = await assertOrgOwner(parsed.data.orgId);
  if (!gate.ok) return { ok: false, error: gate.error };

  const baseRole = parsed.data.baseRole ?? deriveBaseRoleFromCodes(parsed.data.permissionCodes);
  const supabase = await createClient();

  const { data: preset, error } = await supabase
    .from("access_presets")
    .insert({
      org_id: parsed.data.orgId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      is_system: false,
      base_role: baseRole,
      created_by: gate.userId,
    })
    .select("id")
    .single();

  if (error || !preset) {
    const missing =
      error?.code === "PGRST205" ||
      error?.message?.includes("schema cache") ||
      error?.message?.includes("Could not find the table");
    return {
      ok: false,
      error: missing
        ? "Tabela access_presets ausente neste banco. Rode: supabase db push (migrations 20260717150000 e 20260717160000)."
        : (error?.message ?? "Falha ao criar preset."),
    };
  }

  const { error: permError } = await supabase.from("access_preset_permissions").insert(
    parsed.data.permissionCodes.map((code) => ({
      preset_id: preset.id,
      permission_code: code,
    })),
  );

  if (permError) {
    await supabase.from("access_presets").delete().eq("id", preset.id);
    return { ok: false, error: permError.message.includes("ceiling") ? "Permissao acima do teto." : permError.message };
  }

  void emitAuditEvent({
    orgId: parsed.data.orgId,
    eventScope: "org",
    eventType: "preset_created",
    payload: {
      preset_id: preset.id,
      name: parsed.data.name,
      permission_codes: parsed.data.permissionCodes,
    },
  });

  revalidatePath("/settings/access-presets");
  return { ok: true, id: preset.id };
}

export async function updateAccessPresetAction(input: unknown): Promise<ActionResult> {
  const parsed = updateAccessPresetInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const gate = await assertOrgOwner(parsed.data.orgId);
  if (!gate.ok) return { ok: false, error: gate.error };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("access_presets")
    .select("id, is_system, org_id, name")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (!existing || existing.is_system || existing.org_id !== parsed.data.orgId) {
    return { ok: false, error: "Preset nao encontrado ou imutavel." };
  }

  const patch: {
    name?: string;
    description?: string | null;
    base_role?: "viewer" | "admin" | "manager";
  } = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.description !== undefined) patch.description = parsed.data.description;
  if (parsed.data.permissionCodes) {
    patch.base_role = parsed.data.baseRole ?? deriveBaseRoleFromCodes(parsed.data.permissionCodes);
  } else if (parsed.data.baseRole) {
    patch.base_role = parsed.data.baseRole;
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase.from("access_presets").update(patch).eq("id", parsed.data.id);
    if (error) return { ok: false, error: error.message };
  }

  if (parsed.data.permissionCodes) {
    const { error: delErr } = await supabase
      .from("access_preset_permissions")
      .delete()
      .eq("preset_id", parsed.data.id);
    if (delErr) return { ok: false, error: delErr.message };

    const { error: insErr } = await supabase.from("access_preset_permissions").insert(
      parsed.data.permissionCodes.map((code) => ({
        preset_id: parsed.data.id,
        permission_code: code,
      })),
    );
    if (insErr) {
      return { ok: false, error: insErr.message.includes("ceiling") ? "Permissao acima do teto." : insErr.message };
    }
  }

  void emitAuditEvent({
    orgId: parsed.data.orgId,
    eventScope: "org",
    eventType: "preset_updated",
    payload: {
      preset_id: parsed.data.id,
      name: parsed.data.name ?? existing.name,
      permission_codes: parsed.data.permissionCodes,
    },
  });

  revalidatePath("/settings/access-presets");
  return { ok: true };
}

export async function deleteAccessPresetAction(input: unknown): Promise<ActionResult> {
  const parsed = deleteAccessPresetInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const gate = await assertOrgOwner(parsed.data.orgId);
  if (!gate.ok) return { ok: false, error: gate.error };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("access_presets")
    .select("id, name")
    .eq("id", parsed.data.id)
    .eq("org_id", parsed.data.orgId)
    .eq("is_system", false)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Preset nao encontrado ou imutavel." };

  const { error } = await supabase
    .from("access_presets")
    .delete()
    .eq("id", parsed.data.id)
    .eq("org_id", parsed.data.orgId)
    .eq("is_system", false);

  if (error) {
    if (error.message.includes("preset_in_use")) {
      return { ok: false, error: "Preset em uso. Reatribua os membros antes." };
    }
    return { ok: false, error: error.message };
  }

  void emitAuditEvent({
    orgId: parsed.data.orgId,
    eventScope: "org",
    eventType: "preset_deleted",
    payload: { preset_id: parsed.data.id, name: existing.name },
  });

  revalidatePath("/settings/access-presets");
  return { ok: true };
}

export async function assignBoardMemberPresetAction(input: unknown): Promise<ActionResult> {
  const parsed = assignBoardMemberPresetInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nao autenticado." };

  const { data: board } = await supabase
    .from("boards")
    .select("org_id, name")
    .eq("id", parsed.data.boardId)
    .single();
  if (!board) return { ok: false, error: "Projeto nao encontrado." };

  const { data: orgMembership } = await supabase
    .from("memberships")
    .select("role")
    .eq("org_id", board.org_id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: boardMember } = await supabase
    .from("board_members")
    .select("role, preset_id")
    .eq("board_id", parsed.data.boardId)
    .eq("user_id", user.id)
    .maybeSingle();

  let permissionCodes: BoardPermissionCode[] | null = null;
  if (boardMember?.preset_id) {
    const { data: perms } = await supabase
      .from("access_preset_permissions")
      .select("permission_code")
      .eq("preset_id", boardMember.preset_id);
    if (perms?.length) {
      permissionCodes = perms.map((p) => p.permission_code as BoardPermissionCode);
    }
  }

  const canAssign = computeCanManageBoardMembers({
    orgRole: orgMembership?.role ?? null,
    boardRole: boardMember?.role ?? null,
    deptRole: null,
    hasDepartment: false,
    permissionCodes,
    isOrgOwner: orgMembership?.role === "owner",
  });

  if (!canAssign) return { ok: false, error: "Sem permissao para atribuir preset." };

  // IDOR: preset system OU mesma org
  const { data: preset } = await supabase
    .from("access_presets")
    .select("id, org_id, is_system, name")
    .eq("id", parsed.data.presetId)
    .maybeSingle();
  if (!preset || (!preset.is_system && preset.org_id !== board.org_id)) {
    return { ok: false, error: "Preset invalido para este projeto." };
  }

  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", parsed.data.userId)
    .maybeSingle();

  const { error } = await supabase
    .from("board_members")
    .update({ preset_id: parsed.data.presetId })
    .eq("board_id", parsed.data.boardId)
    .eq("user_id", parsed.data.userId);

  if (error) return { ok: false, error: error.message };

  void emitAuditEvent({
    orgId: board.org_id,
    eventScope: "board",
    eventType: "preset_assigned",
    boardId: parsed.data.boardId,
    payload: {
      preset_id: parsed.data.presetId,
      preset_name: preset.name,
      user_id: parsed.data.userId,
      user_name: targetProfile?.full_name ?? null,
      board_name: board.name,
    },
  });

  revalidatePath(`/boards/${parsed.data.boardId}`);
  revalidatePath("/projects");
  return { ok: true };
}
