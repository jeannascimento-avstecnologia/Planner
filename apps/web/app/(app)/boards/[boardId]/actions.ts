"use server";

import { revalidatePath } from "next/cache";
import { revalidateHomeProjects, revalidateBoard } from "@/lib/revalidation";
import { acceptBoardInviteByToken } from "@/lib/accept-board-invite";
import { createClient } from "@/lib/supabase/server";
import {
  attachTagInput,
  createColumnInput,
  createTagInput,
  createTifluxTicketInput,
  deleteColumnInput,
  deleteTagInput,
  detachTagInput,
  inviteBoardInput,
  inviteBoardBatchInput,
  linkTifluxTicketInput,
  tifluxSearchInput,
  updateBoardMemberRoleInput,
  removeBoardMemberInput,
  updateColumnInput,
  type Json,
  type InviteBoardBatchInput,
  createAutomationRuleInput,
  updateAutomationRuleInput,
  deleteAutomationRuleInput,
} from "@nextgen/contracts";
import { lexoPosition } from "@/lib/fractional";
import { normalizeBoardItemName } from "@/lib/board-item-names";

const DUPLICATE_COLUMN_MSG = "Ja existe uma coluna com este nome neste projeto.";

async function boardHasColumnName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  boardId: string,
  name: string,
): Promise<boolean> {
  const target = normalizeBoardItemName(name);
  const { data } = await supabase.from("columns").select("name").eq("board_id", boardId);
  return (data ?? []).some((row) => normalizeBoardItemName(row.name) === target);
}

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}
import { TAG_DEFAULT_COLORS } from "@/lib/ui-classes";
import { getAppUrl } from "@/lib/app-url";
import type { EmailSendErrorCode } from "@/lib/email";
import { inviteEmailFailureMessage } from "@/lib/invite-email-messages";
import { isOrgAdminRole, isOrgOwnerRole } from "@/lib/org-member-roles";
import { SYSTEM_PRESET_BY_ROLE } from "@/lib/access-presets";
import { canWriteBoard } from "@/lib/board-member-roles";
import { getActiveOrgId } from "@/lib/active-org";
import { checkInviteBatchRateLimit } from "@/lib/invite-rate-limit";
import { makeSecureToken } from "@/lib/tokens";
import { sendBoardInviteEmail } from "@/lib/notifications/board-invite";
import {
  createTifluxTicket as callTifluxApi,
  getTifluxTicketByNumber,
  searchTifluxClients,
  searchTifluxDesks,
  searchTifluxUsers,
  searchTifluxRequestors,
  searchTifluxParentTickets,
  listTifluxDeskPriorities,
  listTifluxServicesCatalogItems,
  type TifluxOption,
} from "@/lib/tiflux-api";
import { resolveBoardTifluxTokenDetailed } from "@/lib/tiflux-credentials";

export type CreateColumnResult = { ok: true } | { error: string };

export async function createColumn(formData: FormData): Promise<CreateColumnResult> {
  const parsed = createColumnInput.safeParse({
    boardId: formData.get("boardId"),
    name: formData.get("name"),
  });
  if (!parsed.success) return { error: "Dados invalidos." };

  const supabase = await createClient();
  const { data: board } = await supabase
    .from("boards")
    .select("org_id")
    .eq("id", parsed.data.boardId)
    .single();
  if (!board) return { error: "Projeto nao encontrado." };

  if (await boardHasColumnName(supabase, parsed.data.boardId, parsed.data.name)) {
    return { error: DUPLICATE_COLUMN_MSG };
  }

  const { error } = await supabase.from("columns").insert({
    board_id: parsed.data.boardId,
    org_id: board.org_id,
    name: parsed.data.name,
    position: lexoPosition(),
  });
  if (isUniqueViolation(error)) return { error: DUPLICATE_COLUMN_MSG };
  if (error) return { error: "Nao foi possivel criar a coluna." };

  revalidateBoard(parsed.data.boardId);
  return { ok: true };
}

export async function updateColumn(formData: FormData): Promise<void> {
  const parsed = updateColumnInput.safeParse({
    boardId: formData.get("boardId"),
    columnId: formData.get("columnId"),
    name: formData.get("name"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("columns")
    .update({ name: parsed.data.name })
    .eq("id", parsed.data.columnId)
    .eq("board_id", parsed.data.boardId);
  if (error) return;

  revalidateBoard(parsed.data.boardId);
}

export type DeleteColumnResult = { ok: true } | { error: string };

export async function deleteColumn(formData: FormData): Promise<DeleteColumnResult> {
  const parsed = deleteColumnInput.safeParse({
    boardId: formData.get("boardId"),
    columnId: formData.get("columnId"),
  });
  if (!parsed.success) return { error: "Dados invalidos." };

  const supabase = await createClient();
  const { count } = await supabase
    .from("columns")
    .select("id", { count: "exact", head: true })
    .eq("board_id", parsed.data.boardId);
  if ((count ?? 0) <= 1) return { error: "Nao e possivel excluir a ultima coluna do projeto." };

  const { error } = await supabase
    .from("columns")
    .delete()
    .eq("id", parsed.data.columnId)
    .eq("board_id", parsed.data.boardId);
  if (error) return { error: "Nao foi possivel excluir a coluna." };

  revalidateBoard(parsed.data.boardId, { calendar: true });
  return { ok: true };
}

export type CreateTagResult = { ok: true; tagId: string } | { error: string };

export async function createTag(formData: FormData): Promise<CreateTagResult> {
  const orgId = String(formData.get("orgId") ?? "");
  const boardId = String(formData.get("boardId") ?? "");
  const rawColor = String(formData.get("color") ?? TAG_DEFAULT_COLORS[0]);
  const color = /^#[0-9A-Fa-f]{6}$/.test(rawColor) ? rawColor : TAG_DEFAULT_COLORS[0];
  const parsed = createTagInput.safeParse({
    boardId: formData.get("boardId"),
    name: formData.get("name"),
    color,
  });
  if (!parsed.success || !orgId || !boardId) return { error: "Dados invalidos." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tags")
    .insert({
      org_id: orgId,
      board_id: parsed.data.boardId,
      name: parsed.data.name,
      color: parsed.data.color,
    })
    .select("id")
    .single();

  revalidateBoard(boardId);

  if (error) {
    if (error.code === "23505") return { error: "Marcador ja existe." };
    return { error: "Nao foi possivel criar o marcador." };
  }
  return { ok: true, tagId: data.id };
}

export async function attachTag(formData: FormData): Promise<void> {
  const parsed = attachTagInput.safeParse({
    cardId: formData.get("cardId"),
    boardId: formData.get("boardId"),
    tagId: formData.get("tagId"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const { data: card } = await supabase
    .from("cards")
    .select("org_id")
    .eq("id", parsed.data.cardId)
    .single();
  if (!card) return;

  await supabase.from("card_tags").upsert({
    card_id: parsed.data.cardId,
    tag_id: parsed.data.tagId,
    org_id: card.org_id,
  });
  revalidateBoard(parsed.data.boardId);
}

export async function detachTag(formData: FormData): Promise<void> {
  const parsed = detachTagInput.safeParse({
    cardId: formData.get("cardId"),
    boardId: formData.get("boardId"),
    tagId: formData.get("tagId"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase
    .from("card_tags")
    .delete()
    .eq("card_id", parsed.data.cardId)
    .eq("tag_id", parsed.data.tagId);
  revalidateBoard(parsed.data.boardId);
}

export type DeleteTagResult = { ok: true } | { error: string };

export async function deleteTag(formData: FormData): Promise<DeleteTagResult> {
  const parsed = deleteTagInput.safeParse({
    tagId: formData.get("tagId"),
    boardId: formData.get("boardId"),
  });
  if (!parsed.success) return { error: "Dados invalidos." };

  const supabase = await createClient();
  const { error } = await supabase.from("tags").delete().eq("id", parsed.data.tagId);
  if (error) return { error: "Nao foi possivel excluir o marcador." };

  revalidateBoard(parsed.data.boardId);
  return { ok: true };
}

export type InviteResult = { ok: true; inviteUrl?: string; added?: boolean } | { ok: false; error: string };

export type InviteBatchItemResult = {
  email: string;
  ok: boolean;
  error?: string;
  inviteUrl?: string;
  emailSent?: boolean;
  emailErrorCode?: EmailSendErrorCode;
};

export type InviteBatchResult =
  | { ok: true; results: InviteBatchItemResult[] }
  | { ok: false; error: string };

async function assertCanManageBoardMembers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  boardId: string,
  userId: string,
): Promise<{ ok: true; orgId: string } | { ok: false; error: string }> {
  const { data: board } = await supabase.from("boards").select("org_id").eq("id", boardId).single();
  if (!board) return { ok: false, error: "Projeto nao encontrado." };

  const { data: orgMembership } = await supabase
    .from("memberships")
    .select("role")
    .eq("org_id", board.org_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (isOrgOwnerRole(orgMembership?.role)) return { ok: true, orgId: board.org_id };

  const { data: boardMember } = await supabase
    .from("board_members")
    .select("role, preset_id")
    .eq("board_id", boardId)
    .eq("user_id", userId)
    .maybeSingle();
  if (boardMember?.role === "manager") return { ok: true, orgId: board.org_id };

  // Preset com members.* (Administrador custom)
  if (boardMember?.preset_id) {
    const { data: perms } = await supabase
      .from("access_preset_permissions")
      .select("permission_code")
      .eq("preset_id", boardMember.preset_id);
    const codes = new Set((perms ?? []).map((p) => p.permission_code));
    if (
      codes.has("board.manage_members") ||
      codes.has("board.members.invite") ||
      codes.has("board.members.update") ||
      codes.has("board.members.remove")
    ) {
      return { ok: true, orgId: board.org_id };
    }
  }

  return { ok: false, error: "Sem permissao para gerenciar participantes." };
}

export async function inviteToBoard(formData: FormData): Promise<InviteResult> {
  const parsed = inviteBoardInput.safeParse({
    boardId: formData.get("boardId"),
    email: formData.get("email"),
    role: formData.get("role") || "viewer",
  });
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nao autenticado." };

  const access = await assertCanManageBoardMembers(supabase, parsed.data.boardId, user.id);
  if (!access.ok) return { ok: false, error: access.error };

  const { data: board } = await supabase
    .from("boards")
    .select("org_id")
    .eq("id", parsed.data.boardId)
    .single();
  if (!board) return { ok: false, error: "Projeto nao encontrado." };

  const email = parsed.data.email.toLowerCase();

  const { token, hash } = makeSecureToken();
  const expires = new Date();
  expires.setDate(expires.getDate() + 7);

  const { error } = await supabase.from("invitations").insert({
    org_id: board.org_id,
    board_id: parsed.data.boardId,
    email,
    role: parsed.data.role,
    token_hash: hash,
    expires_at: expires.toISOString(),
    created_by: user.id,
  });

  if (error) {
    // If user already in org, try direct board_members add via email match in profiles - skip for MVP
    return { ok: false, error: error.message };
  }

  const appUrl = await getAppUrl();
  return { ok: true, inviteUrl: `${appUrl}/invite?token=${token}` };
}

export async function inviteToBoardBatch(input: InviteBoardBatchInput): Promise<InviteBatchResult> {
  const parsed = inviteBoardBatchInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nao autenticado." };

  const access = await assertCanManageBoardMembers(supabase, parsed.data.boardId, user.id);
  if (!access.ok) return { ok: false, error: access.error };

  const rate = await checkInviteBatchRateLimit(user.id, parsed.data.invites.length);
  if (!rate.allowed) {
    return { ok: false, error: "Limite de convites por hora atingido. Tente novamente mais tarde." };
  }

  const { data: board } = await supabase
    .from("boards")
    .select("org_id, name")
    .eq("id", parsed.data.boardId)
    .single();
  if (!board) return { ok: false, error: "Projeto nao encontrado." };

  const { data: inviterProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const inviterName = inviterProfile?.full_name?.trim() || user.email || "Um membro da equipe";
  const appUrl = await getAppUrl();
  const seen = new Set<string>();
  const results: InviteBatchItemResult[] = [];

  for (const invite of parsed.data.invites) {
    const email = invite.email.trim().toLowerCase();
    if (seen.has(email)) {
      results.push({ email, ok: false, error: "Email duplicado na lista." });
      continue;
    }
    seen.add(email);

    const { token, hash } = makeSecureToken();
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);
    const inviteUrl = `${appUrl}/invite?token=${token}`;

    const { error } = await supabase.from("invitations").insert({
      org_id: board.org_id,
      board_id: parsed.data.boardId,
      email,
      role: invite.role,
      preset_id: invite.presetId ?? null,
      token_hash: hash,
      expires_at: expires.toISOString(),
      created_by: user.id,
    });

    if (error) {
      results.push({ email, ok: false, error: error.message });
      continue;
    }

    const emailResult = await sendBoardInviteEmail({
      to: email,
      boardName: board.name,
      inviterName,
      role: invite.role,
      inviteUrl,
      appUrl,
      expiresAt: expires,
    });

    const emailSent = emailResult.ok;
    results.push({
      email,
      ok: true,
      inviteUrl,
      emailSent,
      emailErrorCode: emailSent ? undefined : emailResult.code,
      error: emailSent ? undefined : inviteEmailFailureMessage(emailResult.code),
    });
  }

  revalidateHomeProjects(user.id);
  revalidateBoard(parsed.data.boardId, { userId: user.id });

  return { ok: true, results };
}

export type UpdateMemberRoleResult = { ok: true } | { ok: false; error: string };

export async function updateBoardMemberRole(formData: FormData): Promise<UpdateMemberRoleResult> {
  const parsed = updateBoardMemberRoleInput.safeParse({
    boardId: formData.get("boardId"),
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nao autenticado." };

  const access = await assertCanManageBoardMembers(supabase, parsed.data.boardId, user.id);
  if (!access.ok) return { ok: false, error: access.error };

  if (user.id === parsed.data.userId) {
    return { ok: false, error: "Voce nao pode alterar seu proprio papel." };
  }

  const { error } = await supabase
    .from("board_members")
    .update({
      role: parsed.data.role,
      preset_id: parsed.data.presetId ?? SYSTEM_PRESET_BY_ROLE[parsed.data.role],
    })
    .eq("board_id", parsed.data.boardId)
    .eq("user_id", parsed.data.userId);

  if (error) return { ok: false, error: "Nao foi possivel atualizar o papel." };

  revalidateHomeProjects(user.id);
  revalidateBoard(parsed.data.boardId, { userId: user.id });
  return { ok: true };
}

export type RemoveBoardMemberResult = { ok: true } | { ok: false; error: string };

export async function removeBoardMember(formData: FormData): Promise<RemoveBoardMemberResult> {
  const parsed = removeBoardMemberInput.safeParse({
    boardId: formData.get("boardId"),
    userId: formData.get("userId"),
  });
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nao autenticado." };

  if (parsed.data.userId === user.id) {
    return { ok: false, error: "Voce nao pode remover seu proprio acesso." };
  }

  const access = await assertCanManageBoardMembers(supabase, parsed.data.boardId, user.id);
  if (!access.ok) return { ok: false, error: access.error };

  const { error } = await supabase
    .from("board_members")
    .delete()
    .eq("board_id", parsed.data.boardId)
    .eq("user_id", parsed.data.userId);

  if (error) return { ok: false, error: "Nao foi possivel remover o membro." };

  revalidateHomeProjects(user.id);
  revalidateBoard(parsed.data.boardId, { userId: user.id });
  return { ok: true };
}

export async function acceptInvite(token: string): Promise<{ boardId?: string; error?: string }> {
  const result = await acceptBoardInviteByToken(token);
  if (result.boardId) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    revalidateHomeProjects(user?.id);
  }
  return result;
}

export async function createIcalFeedToken(boardId?: string): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nao autenticado." };

  let orgId: string | null = null;
  if (boardId) {
    const { data: board } = await supabase.from("boards").select("org_id").eq("id", boardId).maybeSingle();
    if (!board?.org_id) return { error: "Projeto nao encontrado." };
    // RLS/can_access: se nao ve o board, select falha ou org_id ausente
    const { data: accessible } = await supabase.from("boards").select("id").eq("id", boardId).maybeSingle();
    if (!accessible) return { error: "Sem acesso a este projeto." };
    orgId = board.org_id;
  }
  if (!orgId) orgId = await getActiveOrgId();
  if (!orgId) return { error: "Sem organizacao." };

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return { error: "Sem acesso a organizacao." };

  const { token, hash } = makeSecureToken();
  const { error } = await supabase.from("ical_feed_tokens").insert({
    org_id: orgId,
    user_id: user.id,
    board_id: boardId ?? null,
    token_hash: hash,
  });
  if (error) return { error: error.message };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return { url: `${appUrl}/api/ical/${token}` };
}

export type TifluxTicketActionResult =
  | { ok: true; ticketNumber: string; ticketId: string }
  | { error: string };

export type TifluxSearchActionResult = { ok: true; options: TifluxOption[] } | { error: string };

/** Decrypt/use Tiflux token only after can_write_board (viewer must not). */
async function assertBoardTifluxWriteAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  boardId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nao autenticado." };

  const { data: board } = await supabase.from("boards").select("org_id").eq("id", boardId).single();
  if (!board) return { ok: false, error: "Projeto nao encontrado." };

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("org_id", board.org_id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: boardMember } = await supabase
    .from("board_members")
    .select("role")
    .eq("board_id", boardId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!canWriteBoard(isOrgAdminRole(membership?.role), boardMember?.role)) {
    return { ok: false, error: "Sem permissao para usar a integracao Tiflux neste projeto." };
  }
  return { ok: true };
}

export async function searchTifluxOptions(input: {
  boardId: string;
  kind: string;
  query?: string;
  deskId?: number;
  clientId?: number;
  ticketNumber?: number;
}): Promise<TifluxSearchActionResult> {
  const parsed = tifluxSearchInput.safeParse(input);
  if (!parsed.success) return { error: "Parametros invalidos." };

  const supabase = await createClient();
  const write = await assertBoardTifluxWriteAccess(supabase, parsed.data.boardId);
  if (!write.ok) return { error: write.error };

  const { data: board } = await supabase
    .from("boards")
    .select("tiflux_enabled")
    .eq("id", parsed.data.boardId)
    .single();
  if (!board?.tiflux_enabled) return { error: "Projeto nao vinculado ao Tiflux." };

  const resolved = await resolveBoardTifluxTokenDetailed(parsed.data.boardId);
  if (!resolved.ok) return { error: resolved.message };

  const { kind, query, deskId, clientId } = parsed.data;
  const { token, apiUrl } = resolved.creds;
  try {
    let options: TifluxOption[] = [];
    if (kind === "client") options = await searchTifluxClients(token, query, apiUrl);
    else if (kind === "desk") options = await searchTifluxDesks(token, query, apiUrl);
    else if (kind === "requestor") options = await searchTifluxRequestors(token, query, clientId, apiUrl);
    else if (kind === "user") options = await searchTifluxUsers(token, query, apiUrl);
    else if (kind === "priority") {
      if (!deskId) return { error: "Selecione a mesa primeiro." };
      options = await listTifluxDeskPriorities(token, deskId, apiUrl);
    } else if (kind === "services_catalog_item") {
      if (!deskId) return { error: "Selecione a mesa primeiro." };
      options = await listTifluxServicesCatalogItems(token, deskId, query, apiUrl);
    } else if (kind === "parent_ticket") {
      if (!deskId) return { error: "Selecione a mesa primeiro." };
      options = await searchTifluxParentTickets(token, deskId, query, apiUrl);
    }
    return { ok: true, options };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Falha ao consultar o Tiflux." };
  }
}

export async function createTifluxTicket(formData: FormData): Promise<TifluxTicketActionResult> {
  const followersRaw = formData.get("followers");
  const followers = typeof followersRaw === "string" && followersRaw
    ? followersRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;

  const parsed = createTifluxTicketInput.safeParse({
    cardId: formData.get("cardId"),
    boardId: formData.get("boardId"),
    title: formData.get("title"),
    description: formData.get("description"),
    clientId: formData.get("clientId") || undefined,
    deskId: formData.get("deskId") || undefined,
    priorityId: formData.get("priorityId") || undefined,
    servicesCatalogsItemId: formData.get("servicesCatalogsItemId") || undefined,
    requestorId: formData.get("requestorId") || undefined,
    requestorName: formData.get("requestorName") || undefined,
    requestorEmail: formData.get("requestorEmail") || undefined,
    followers,
    parentTicketNumber: formData.get("parentTicketNumber") || undefined,
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first ? `Campo invalido: ${first.path.join(".")}` : "Dados invalidos." };
  }

  const supabase = await createClient();
  const write = await assertBoardTifluxWriteAccess(supabase, parsed.data.boardId);
  if (!write.ok) return { error: write.error };

  const { data: board } = await supabase
    .from("boards")
    .select("org_id, tiflux_enabled")
    .eq("id", parsed.data.boardId)
    .single();
  if (!board?.tiflux_enabled) return { error: "Projeto nao vinculado ao Tiflux." };

  const { data: card } = await supabase
    .from("cards")
    .select("id, tiflux_ticket_number")
    .eq("id", parsed.data.cardId)
    .eq("board_id", parsed.data.boardId)
    .single();
  if (!card) return { error: "Card nao encontrado." };
  if (card.tiflux_ticket_number) return { error: "Este card ja possui chamado Tiflux." };

  const resolved = await resolveBoardTifluxTokenDetailed(parsed.data.boardId);
  if (!resolved.ok) return { error: resolved.message };

  let ticket: { ticketId: string; ticketNumber: string; raw: unknown };
  try {
    ticket = await callTifluxApi(parsed.data, resolved.creds.token, resolved.creds.apiUrl);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Falha ao criar chamado no Tiflux." };
  }

  const { error } = await supabase
    .from("cards")
    .update({
      tiflux_ticket_id: ticket.ticketId,
      tiflux_ticket_number: ticket.ticketNumber,
      tiflux_payload: ticket.raw as Json,
      tiflux_created_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.cardId);

  if (error) return { error: "Chamado criado, mas falha ao salvar no card." };

  revalidateBoard(parsed.data.boardId);
  return { ok: true, ticketNumber: ticket.ticketNumber, ticketId: ticket.ticketId };
}

export async function linkTifluxTicket(formData: FormData): Promise<TifluxTicketActionResult> {
  const parsed = linkTifluxTicketInput.safeParse({
    cardId: formData.get("cardId"),
    boardId: formData.get("boardId"),
    clientId: formData.get("clientId"),
    deskId: formData.get("deskId"),
    ticketNumber: formData.get("ticketNumber"),
    parentTicketNumber: formData.get("parentTicketNumber") || undefined,
    childTicketNumber: formData.get("childTicketNumber") || undefined,
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first ? `Campo invalido: ${first.path.join(".")}` : "Dados invalidos." };
  }

  const supabase = await createClient();
  const write = await assertBoardTifluxWriteAccess(supabase, parsed.data.boardId);
  if (!write.ok) return { error: write.error };

  const { data: board } = await supabase
    .from("boards")
    .select("org_id, tiflux_enabled")
    .eq("id", parsed.data.boardId)
    .single();
  if (!board?.tiflux_enabled) return { error: "Projeto nao vinculado ao Tiflux." };

  const { data: card } = await supabase
    .from("cards")
    .select("id, tiflux_ticket_number")
    .eq("id", parsed.data.cardId)
    .eq("board_id", parsed.data.boardId)
    .single();
  if (!card) return { error: "Card nao encontrado." };
  if (card.tiflux_ticket_number) return { error: "Este card ja possui chamado Tiflux." };

  const resolved = await resolveBoardTifluxTokenDetailed(parsed.data.boardId);
  if (!resolved.ok) return { error: resolved.message };

  let ticket: { ticketId: string; ticketNumber: string; raw: unknown };
  try {
    ticket = await getTifluxTicketByNumber(
      resolved.creds.token,
      parsed.data.ticketNumber,
      resolved.creds.apiUrl,
    );
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Chamado nao encontrado no Tiflux." };
  }

  const payload = {
    ...(ticket.raw && typeof ticket.raw === "object" ? (ticket.raw as Record<string, unknown>) : {}),
    link_meta: {
      client_id: parsed.data.clientId,
      desk_id: parsed.data.deskId,
      parent_ticket_number: parsed.data.parentTicketNumber ?? null,
      child_ticket_number: parsed.data.childTicketNumber ?? null,
      linked_at: new Date().toISOString(),
    },
  };

  const { error } = await supabase
    .from("cards")
    .update({
      tiflux_ticket_id: ticket.ticketId,
      tiflux_ticket_number: ticket.ticketNumber,
      tiflux_payload: payload as Json,
      tiflux_created_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.cardId);

  if (error) return { error: "Falha ao vincular chamado ao card." };

  revalidateBoard(parsed.data.boardId);
  return { ok: true, ticketNumber: ticket.ticketNumber, ticketId: ticket.ticketId };
}

export type AutomationActionResult = { ok: true } | { error: string };

async function assertBoardAutomationAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  boardId: string,
): Promise<{ ok: true; orgId: string; userId: string } | { ok: false; error: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nao autenticado." };

  const { data: board } = await supabase.from("boards").select("org_id").eq("id", boardId).single();
  if (!board) return { ok: false, error: "Projeto nao encontrado." };

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("org_id", board.org_id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: boardMember } = await supabase
    .from("board_members")
    .select("role, preset_id")
    .eq("board_id", boardId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (isOrgOwnerRole(membership?.role) || boardMember?.role === "manager") {
    return { ok: true, orgId: board.org_id, userId: user.id };
  }

  if (boardMember?.preset_id) {
    const { data: perms } = await supabase
      .from("access_preset_permissions")
      .select("permission_code")
      .eq("preset_id", boardMember.preset_id);
    const codes = new Set((perms ?? []).map((p) => p.permission_code));
    if (codes.has("board.automations.manage") || codes.has("board.manage_settings")) {
      return { ok: true, orgId: board.org_id, userId: user.id };
    }
  }

  return { ok: false, error: "Sem permissao para gerenciar automacoes." };
}

export async function createAutomationRule(formData: FormData): Promise<AutomationActionResult> {
  const rawActions = formData.get("actions");
  let actionsParsed: unknown = [];
  try {
    actionsParsed = rawActions ? JSON.parse(String(rawActions)) : [];
  } catch {
    return { error: "Acoes invalidas." };
  }

  const parsed = createAutomationRuleInput.safeParse({
    boardId: formData.get("boardId"),
    orgId: formData.get("orgId"),
    name: formData.get("name"),
    triggerEvent: formData.get("triggerEvent"),
    conditions: {
      column_id: formData.get("conditionColumnId") || undefined,
      priority: formData.get("conditionPriority") || undefined,
    },
    actions: actionsParsed,
  });
  if (!parsed.success) return { error: "Dados invalidos." };

  const supabase = await createClient();
  const auth = await assertBoardAutomationAdmin(supabase, parsed.data.boardId);
  if (!auth.ok) return { error: auth.error };

  const { error } = await supabase.from("automation_rules").insert({
    org_id: auth.orgId,
    board_id: parsed.data.boardId,
    name: parsed.data.name,
    trigger_event: parsed.data.triggerEvent,
    conditions: parsed.data.conditions as Json,
    actions: parsed.data.actions as Json,
    active: true,
  });
  if (error) return { error: error.message };

  revalidateBoard(parsed.data.boardId);
  return { ok: true };
}

export async function updateAutomationRule(formData: FormData): Promise<AutomationActionResult> {
  const parsed = updateAutomationRuleInput.safeParse({
    ruleId: formData.get("ruleId"),
    boardId: formData.get("boardId"),
    active: formData.get("active") === "true" ? true : formData.get("active") === "false" ? false : undefined,
    name: formData.get("name") || undefined,
  });
  if (!parsed.success) return { error: "Dados invalidos." };

  const supabase = await createClient();
  const auth = await assertBoardAutomationAdmin(supabase, parsed.data.boardId);
  if (!auth.ok) return { error: auth.error };

  const patch: { active?: boolean; name?: string; updated_at: string } = {
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.active !== undefined) patch.active = parsed.data.active;
  if (parsed.data.name) patch.name = parsed.data.name;

  const { error } = await supabase
    .from("automation_rules")
    .update(patch)
    .eq("id", parsed.data.ruleId)
    .eq("board_id", parsed.data.boardId);
  if (error) return { error: error.message };

  revalidateBoard(parsed.data.boardId);
  return { ok: true };
}

export async function deleteAutomationRule(formData: FormData): Promise<AutomationActionResult> {
  const parsed = deleteAutomationRuleInput.safeParse({
    ruleId: formData.get("ruleId"),
    boardId: formData.get("boardId"),
  });
  if (!parsed.success) return { error: "Dados invalidos." };

  const supabase = await createClient();
  const auth = await assertBoardAutomationAdmin(supabase, parsed.data.boardId);
  if (!auth.ok) return { error: auth.error };

  const { error } = await supabase
    .from("automation_rules")
    .delete()
    .eq("id", parsed.data.ruleId)
    .eq("board_id", parsed.data.boardId);
  if (error) return { error: error.message };

  revalidateBoard(parsed.data.boardId);
  return { ok: true };
}
