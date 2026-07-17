import { createClient } from "@/lib/supabase/server";
import {
  deriveBaseRoleFromCodes,
  isBoardCeilingCode,
  type AccessPresetRow,
} from "@/lib/access-presets";
import type { BoardMemberRole, BoardPermissionCode } from "@nextgen/contracts";

type PresetDb = {
  id: string;
  org_id: string | null;
  name: string;
  description: string | null;
  is_system: boolean;
  system_key: string | null;
  base_role: string;
};

/** Anexa `presetName` a membros a partir de um catálogo já carregado (sem N+1). */
export function attachPresetNames<T extends { preset_id?: string | null }>(
  members: T[],
  presets: Array<{ id: string; name: string }>,
): Array<T & { presetName?: string }> {
  const nameById = new Map(presets.map((p) => [p.id, p.name]));
  return members.map((m) => ({
    ...m,
    presetName: m.preset_id ? nameById.get(m.preset_id) : undefined,
  }));
}

export async function listAccessPresets(orgId: string): Promise<AccessPresetRow[]> {
  const supabase = await createClient();

  const { data: presets, error } = await supabase
    .from("access_presets")
    .select("id, org_id, name, description, is_system, system_key, base_role")
    .or(`is_system.eq.true,org_id.eq.${orgId}`)
    .order("is_system", { ascending: false })
    .order("name", { ascending: true });

  if (error || !presets) return [];

  const ids = presets.map((p) => p.id);
  const { data: perms } = await supabase
    .from("access_preset_permissions")
    .select("preset_id, permission_code")
    .in("preset_id", ids);

  const { data: usage } = await supabase
    .from("board_members")
    .select("preset_id")
    .in("preset_id", ids)
    .not("preset_id", "is", null);

  const codesByPreset = new Map<string, BoardPermissionCode[]>();
  for (const row of perms ?? []) {
    const list = codesByPreset.get(row.preset_id) ?? [];
    if (isBoardCeilingCode(row.permission_code) || row.permission_code.startsWith("board.") || row.permission_code.startsWith("org.")) {
      list.push(row.permission_code as BoardPermissionCode);
    }
    codesByPreset.set(row.preset_id, list);
  }

  const usageCount = new Map<string, number>();
  for (const row of usage ?? []) {
    if (!row.preset_id) continue;
    usageCount.set(row.preset_id, (usageCount.get(row.preset_id) ?? 0) + 1);
  }

  return (presets as PresetDb[]).map((p) => ({
    id: p.id,
    orgId: p.org_id,
    name: p.name,
    description: p.description,
    isSystem: p.is_system,
    systemKey: p.system_key,
    baseRole: (p.base_role === "manager" || p.base_role === "admin" || p.base_role === "viewer"
      ? p.base_role
      : "viewer") as BoardMemberRole,
    permissionCodes: codesByPreset.get(p.id) ?? [],
    usersUsing: usageCount.get(p.id) ?? 0,
  }));
}

export async function resolvePresetForInvite(
  orgId: string,
  presetId: string | undefined,
  fallbackRole: BoardMemberRole,
): Promise<{ role: BoardMemberRole; presetId: string | null } | { error: string }> {
  if (!presetId) {
    return { role: fallbackRole, presetId: null };
  }
  const supabase = await createClient();
  const { data: preset } = await supabase
    .from("access_presets")
    .select("id, org_id, is_system, base_role")
    .eq("id", presetId)
    .maybeSingle();

  if (!preset) return { error: "Preset invalido." };
  if (!preset.is_system && preset.org_id !== orgId) return { error: "Preset de outra organizacao." };

  const role =
    preset.base_role === "manager" || preset.base_role === "admin" || preset.base_role === "viewer"
      ? preset.base_role
      : deriveBaseRoleFromCodes([]);

  return { role, presetId: preset.id };
}
