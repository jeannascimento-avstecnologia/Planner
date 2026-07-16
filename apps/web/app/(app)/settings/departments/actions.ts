"use server";

import { revalidateOrgSettings, revalidateHomeProjects, revalidateBoard } from "@/lib/revalidation";
import { revalidatePath } from "next/cache";
import { rateLimitAction } from "@/lib/rate-limit";
import { sanitizeName } from "@/lib/sanitize";
import { createClient } from "@/lib/supabase/server";
import {
  addDepartmentMemberInput,
  createDepartmentInput,
  deleteDepartmentInput,
  removeDepartmentMemberInput,
  setBoardDepartmentInput,
  updateDepartmentInput,
  updateDepartmentMemberRoleInput,
  uuid,
} from "@nextgen/contracts";
import { loadBoardDepartmentContext } from "@/lib/load-board-department-context";

type ActionResult = { ok: true } | { ok: false; error: string };

function mapRpcError(message: string): string {
  if (message.includes("forbidden")) return "Sem permissao.";
  if (message.includes("cannot_change_own_role")) return "Voce nao pode alterar seu proprio papel.";
  if (message.includes("cannot_remove_self")) return "Voce nao pode se remover.";
  if (message.includes("user_not_in_org")) return "Usuario nao pertence a organizacao.";
  if (message.includes("department_not_found")) return "Departamento nao encontrado.";
  if (message.includes("member_not_found")) return "Membro nao encontrado.";
  return "Operacao nao concluida.";
}

export async function createDepartmentAction(formData: FormData): Promise<ActionResult> {
  const parsed = createDepartmentInput.safeParse({
    orgId: formData.get("orgId"),
    name: formData.get("name"),
    icon: formData.get("icon") || undefined,
    color: formData.get("color") || undefined,
  });
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nao autenticado." };

  const rl = await rateLimitAction(user.id, "createDepartment", 20, 60_000);
  if (!rl.ok) return { ok: false, error: "Muitas requisicoes. Aguarde alguns segundos." };

  const { error } = await supabase.rpc("create_department", {
    p_org: parsed.data.orgId,
    p_name: sanitizeName(parsed.data.name, 120),
    p_icon: parsed.data.icon ?? null,
    p_color: parsed.data.color ?? null,
  });
  if (error) return { ok: false, error: mapRpcError(error.message) };

  revalidateOrgSettings(parsed.data.orgId, user.id);
  revalidateHomeProjects(user.id);
  return { ok: true };
}

export async function updateDepartmentAction(formData: FormData): Promise<ActionResult> {
  const parsed = updateDepartmentInput.safeParse({
    departmentId: formData.get("departmentId"),
    name: formData.get("name"),
    icon: formData.has("icon") ? formData.get("icon") || null : undefined,
    color: formData.has("color") ? formData.get("color") || null : undefined,
  });
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.rpc("update_department", {
    p_dept: parsed.data.departmentId,
    p_name: parsed.data.name,
    p_icon: parsed.data.icon ?? null,
    p_color: parsed.data.color ?? null,
  });
  if (error) return { ok: false, error: mapRpcError(error.message) };

  revalidateHomeProjects(user?.id);
  revalidatePath("/settings/organizations");
  return { ok: true };
}

export async function deleteDepartmentAction(formData: FormData): Promise<ActionResult> {
  const parsed = deleteDepartmentInput.safeParse({ departmentId: formData.get("departmentId") });
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.rpc("delete_department", { p_dept: parsed.data.departmentId });
  if (error) return { ok: false, error: mapRpcError(error.message) };

  revalidateHomeProjects(user?.id);
  revalidatePath("/settings/organizations");
  return { ok: true };
}

export async function addDepartmentMemberAction(input: unknown): Promise<ActionResult> {
  const parsed = addDepartmentMemberInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nao autenticado." };

  const rl = await rateLimitAction(user.id, "addDepartmentMember", 30, 60_000);
  if (!rl.ok) return { ok: false, error: "Muitas requisicoes. Aguarde alguns segundos." };

  const { error } = await supabase.rpc("add_department_member", {
    p_dept: parsed.data.departmentId,
    p_user: parsed.data.userId,
    p_role: parsed.data.role,
  });
  if (error) return { ok: false, error: mapRpcError(error.message) };

  revalidateHomeProjects(user.id);
  revalidatePath("/settings/organizations");
  return { ok: true };
}

export async function updateDepartmentMemberRoleAction(input: unknown): Promise<ActionResult> {
  const parsed = updateDepartmentMemberRoleInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.rpc("set_department_member_role", {
    p_dept: parsed.data.departmentId,
    p_user: parsed.data.userId,
    p_role: parsed.data.role,
  });
  if (error) return { ok: false, error: mapRpcError(error.message) };

  revalidateHomeProjects(user?.id);
  revalidatePath("/settings/organizations");
  return { ok: true };
}

export async function removeDepartmentMemberAction(input: unknown): Promise<ActionResult> {
  const parsed = removeDepartmentMemberInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.rpc("remove_department_member", {
    p_dept: parsed.data.departmentId,
    p_user: parsed.data.userId,
  });
  if (error) return { ok: false, error: mapRpcError(error.message) };

  revalidateHomeProjects(user?.id);
  revalidatePath("/settings/organizations");
  return { ok: true };
}

export async function setBoardDepartmentAction(formData: FormData): Promise<ActionResult> {
  const rawDept = formData.get("departmentId");
  const parsed = setBoardDepartmentInput.safeParse({
    boardId: formData.get("boardId"),
    departmentId: rawDept === "" || rawDept === "general" ? null : rawDept,
  });
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.rpc("set_board_department", {
    p_board: parsed.data.boardId,
    p_dept: parsed.data.departmentId,
  });
  if (error) return { ok: false, error: mapRpcError(error.message) };

  revalidateBoard(parsed.data.boardId, { userId: user?.id });
  revalidateHomeProjects(user?.id);
  revalidatePath("/settings/organizations");
  return { ok: true };
}

export async function getBoardDepartmentContextAction(boardId: string) {
  const parsed = uuid.safeParse(boardId);
  if (!parsed.success) return null;
  return loadBoardDepartmentContext(parsed.data);
}
