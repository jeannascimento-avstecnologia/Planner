"use server";

import { revalidateHomeProjects, revalidateBoard } from "@/lib/revalidation";
import { acceptBoardInviteByToken } from "@/lib/accept-board-invite";
import { createClient } from "@/lib/supabase/server";
import {
  attachTagInput,
  createCardInput,
  createColumnInput,
  createTagInput,
  createTifluxTicketInput,
  deleteColumnInput,
  deleteTagInput,
  deleteCardInput,
  detachTagInput,
  inviteBoardInput,
  inviteBoardBatchInput,
  linkTifluxTicketInput,
  moveCardInput,
  tifluxSearchInput,
  updateBoardMemberRoleInput,
  removeBoardMemberInput,
  updateCardInput,
  updateColumnInput,
  type Json,
  type InviteBoardBatchInput,
} from "@nextgen/contracts";
import { lexoPosition } from "@/lib/fractional";
import { resolveCardDateRange } from "@/lib/parse-date-br";
import { sanitizeName } from "@/lib/sanitize";
import { TAG_DEFAULT_COLORS } from "@/lib/ui-classes";
import { getAppUrl } from "@/lib/app-url";
import type { EmailSendErrorCode } from "@/lib/email";
import { inviteEmailFailureMessage } from "@/lib/invite-email-messages";
import { isOrgAdminRole } from "@/lib/org-member-roles";
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

async function emitEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  payload: {
    org_id: string;
    board_id: string;
    card_id: string;
    actor_id: string | null;
    type: "created" | "updated" | "assigned" | "due_changed" | "priority_changed" | "moved";
    from_column_id?: string | null;
    to_column_id?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  await supabase.from("card_events").insert({
    org_id: payload.org_id,
    board_id: payload.board_id,
    card_id: payload.card_id,
    actor_id: payload.actor_id,
    type: payload.type,
    from_column_id: payload.from_column_id ?? null,
    to_column_id: payload.to_column_id ?? null,
    metadata: (payload.metadata ?? {}) as Json,
  });
}

export async function createColumn(formData: FormData): Promise<void> {
  const parsed = createColumnInput.safeParse({
    boardId: formData.get("boardId"),
    name: formData.get("name"),
  });
  if (!parsed.success) return;

  // #region agent log
  const invokeId = crypto.randomUUID();
  fetch("http://127.0.0.1:7735/ingest/ccfd0ebe-18ad-4f5a-9b22-eccef37739f9", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "fa60ca" },
    body: JSON.stringify({
      sessionId: "fa60ca",
      runId: "pre-fix",
      hypothesisId: "H4",
      location: "actions.ts:createColumn",
      message: "createColumn server invoke",
      data: { invokeId, boardId: parsed.data.boardId, nameLen: parsed.data.name.length },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  const supabase = await createClient();
  const { data: board } = await supabase
    .from("boards")
    .select("org_id")
    .eq("id", parsed.data.boardId)
    .single();
  if (!board) return;

  await supabase.from("columns").insert({
    board_id: parsed.data.boardId,
    org_id: board.org_id,
    name: parsed.data.name,
    position: lexoPosition(),
  });
  revalidateBoard(parsed.data.boardId);
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

export type CreateCardResult = { ok: true; cardId: string } | { error: string };

export async function createCard(formData: FormData): Promise<CreateCardResult> {
  const dueRaw = formData.get("dueDate");
  const startRaw = formData.get("startDate");
  const parsed = createCardInput.safeParse({
    boardId: formData.get("boardId"),
    columnId: formData.get("columnId"),
    title: formData.get("title"),
    priority: formData.get("priority") || undefined,
    dueDate: dueRaw && String(dueRaw) !== "" ? `${dueRaw}T12:00:00.000Z` : undefined,
    startDate: startRaw && String(startRaw) !== "" ? `${startRaw}T12:00:00.000Z` : undefined,
    assigneeId: formData.get("assigneeId") || undefined,
  });
  if (!parsed.success) return { error: "Dados invalidos." };

  // #region agent log
  const invokeId = crypto.randomUUID();
  fetch("http://127.0.0.1:7735/ingest/ccfd0ebe-18ad-4f5a-9b22-eccef37739f9", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "fa60ca" },
    body: JSON.stringify({
      sessionId: "fa60ca",
      runId: "pre-fix",
      hypothesisId: "H4",
      location: "actions.ts:createCard",
      message: "createCard server invoke",
      data: { invokeId, boardId: parsed.data.boardId, columnId: parsed.data.columnId, titleLen: parsed.data.title.length },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  let startDate = parsed.data.startDate ?? null;
  const dueDate = parsed.data.dueDate ?? null;
  const resolved = resolveCardDateRange(startDate, dueDate);
  startDate = resolved.start;
  if (
    parsed.data.startDate &&
    dueDate &&
    startDate &&
    new Date(parsed.data.startDate) > new Date(dueDate)
  ) {
    return { error: "Inicio nao pode ser depois do prazo." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: board } = await supabase
    .from("boards")
    .select("org_id")
    .eq("id", parsed.data.boardId)
    .single();
  if (!board) return { error: "Projeto nao encontrado." };

  const { data: card, error } = await supabase
    .from("cards")
    .insert({
      board_id: parsed.data.boardId,
      column_id: parsed.data.columnId,
      org_id: board.org_id,
      title: sanitizeName(parsed.data.title, 500),
      priority: parsed.data.priority,
      due_date: dueDate,
      start_date: startDate,
      assignee_id: parsed.data.assigneeId ?? null,
      position: lexoPosition(),
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !card) return { error: "Nao foi possivel criar o card." };

  await emitEvent(supabase, {
    org_id: board.org_id,
    board_id: parsed.data.boardId,
    card_id: card.id,
    actor_id: user?.id ?? null,
    type: "created",
  });
  await supabase.rpc("notify_board", {
    p_board: parsed.data.boardId,
    p_type: "card_created",
    p_title: "Nova entrega criada",
    p_body: parsed.data.title,
    p_entity_type: "board",
    p_entity_id: parsed.data.boardId,
  });
  revalidateBoard(parsed.data.boardId, { calendar: Boolean(dueDate) });
  return { ok: true, cardId: card.id };
}

export async function updateCard(formData: FormData): Promise<void> {
  const dueRaw = formData.get("dueDate");
  const startRaw = formData.get("startDate");
  const assigneeRaw = formData.get("assigneeId");
  const parsed = updateCardInput.safeParse({
    cardId: formData.get("cardId"),
    boardId: formData.get("boardId"),
    title: formData.get("title") || undefined,
    description: formData.has("description") ? formData.get("description") || null : undefined,
    priority: formData.get("priority") || undefined,
    dueDate:
      dueRaw === ""
        ? null
        : dueRaw
          ? `${dueRaw}T12:00:00.000Z`
          : undefined,
    startDate:
      startRaw === ""
        ? null
        : startRaw
          ? `${startRaw}T12:00:00.000Z`
          : undefined,
    assigneeId: assigneeRaw === "" ? null : assigneeRaw || undefined,
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing } = await supabase
    .from("cards")
    .select("org_id, priority, due_date, start_date, assignee_id")
    .eq("id", parsed.data.cardId)
    .single();
  if (!existing) return;

  const nextStart =
    parsed.data.startDate !== undefined ? parsed.data.startDate : existing.start_date;
  const nextDue = parsed.data.dueDate !== undefined ? parsed.data.dueDate : existing.due_date;
  const resolved = resolveCardDateRange(nextStart, nextDue);
  const resolvedStart = resolved.start;

  const patch: {
    title?: string;
    description?: string | null;
    priority?: typeof parsed.data.priority;
    due_date?: string | null;
    start_date?: string | null;
    assignee_id?: string | null;
  } = {};
  if (parsed.data.title !== undefined) patch.title = parsed.data.title;
  if (parsed.data.description !== undefined) patch.description = parsed.data.description;
  if (parsed.data.priority !== undefined) patch.priority = parsed.data.priority;
  if (parsed.data.dueDate !== undefined) patch.due_date = parsed.data.dueDate;
  if (parsed.data.startDate !== undefined) {
    patch.start_date = parsed.data.startDate === null ? null : resolvedStart;
  } else if (parsed.data.dueDate !== undefined && resolvedStart !== existing.start_date) {
    patch.start_date = resolvedStart;
  }
  if (parsed.data.assigneeId !== undefined) patch.assignee_id = parsed.data.assigneeId;

  const { error } = await supabase.from("cards").update(patch).eq("id", parsed.data.cardId);
  if (error) return;

  if (parsed.data.priority !== undefined && parsed.data.priority !== existing.priority) {
    await emitEvent(supabase, {
      org_id: existing.org_id,
      board_id: parsed.data.boardId,
      card_id: parsed.data.cardId,
      actor_id: user?.id ?? null,
      type: "priority_changed",
      metadata: { from: existing.priority, to: parsed.data.priority },
    });
  }
  if (parsed.data.dueDate !== undefined && parsed.data.dueDate !== existing.due_date) {
    await emitEvent(supabase, {
      org_id: existing.org_id,
      board_id: parsed.data.boardId,
      card_id: parsed.data.cardId,
      actor_id: user?.id ?? null,
      type: "due_changed",
      metadata: { from: existing.due_date, to: parsed.data.dueDate },
    });
  }
  if (parsed.data.assigneeId !== undefined && parsed.data.assigneeId !== existing.assignee_id) {
    await emitEvent(supabase, {
      org_id: existing.org_id,
      board_id: parsed.data.boardId,
      card_id: parsed.data.cardId,
      actor_id: user?.id ?? null,
      type: "assigned",
      metadata: { from: existing.assignee_id, to: parsed.data.assigneeId },
    });
  }

  revalidateBoard(parsed.data.boardId, { calendar: true });
}

export type DeleteCardResult = { ok: true } | { error: string };

export type CardDeleteImpact = { subtasks: number; dependencies: number };

export async function getCardDeleteImpact(cardId: string, boardId: string): Promise<CardDeleteImpact> {
  const supabase = await createClient();
  const [{ count: subtasks }, { count: depsAsBlocker }, { count: depsAsBlocked }] = await Promise.all([
    supabase
      .from("cards")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", cardId)
      .eq("board_id", boardId),
    supabase
      .from("card_dependencies")
      .select("blocker_card_id", { count: "exact", head: true })
      .eq("blocker_card_id", cardId),
    supabase
      .from("card_dependencies")
      .select("blocked_card_id", { count: "exact", head: true })
      .eq("blocked_card_id", cardId),
  ]);
  return {
    subtasks: subtasks ?? 0,
    dependencies: (depsAsBlocker ?? 0) + (depsAsBlocked ?? 0),
  };
}

export async function deleteCard(formData: FormData): Promise<DeleteCardResult> {
  const parsed = deleteCardInput.safeParse({
    cardId: formData.get("cardId"),
    boardId: formData.get("boardId"),
  });
  if (!parsed.success) return { error: "Dados invalidos." };

  const supabase = await createClient();
  const { data: card } = await supabase
    .from("cards")
    .select("id")
    .eq("id", parsed.data.cardId)
    .eq("board_id", parsed.data.boardId)
    .single();
  if (!card) return { error: "Card nao encontrado." };

  const { error } = await supabase.from("cards").delete().eq("id", parsed.data.cardId);
  if (error) return { error: "Nao foi possivel excluir o card." };

  revalidateBoard(parsed.data.boardId, { calendar: true });
  return { ok: true };
}

export type MoveCardResult = { ok: true } | { error: string };

export async function moveCard(formData: FormData): Promise<MoveCardResult> {
  const parsed = moveCardInput.safeParse({
    cardId: formData.get("cardId"),
    boardId: formData.get("boardId"),
    columnId: formData.get("columnId"),
    position: formData.get("position"),
  });
  if (!parsed.success) return { error: "Dados invalidos." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing } = await supabase
    .from("cards")
    .select("id, org_id, column_id")
    .eq("id", parsed.data.cardId)
    .eq("board_id", parsed.data.boardId)
    .single();
  if (!existing) return { error: "Card nao encontrado." };

  const { data: column } = await supabase
    .from("columns")
    .select("id")
    .eq("id", parsed.data.columnId)
    .eq("board_id", parsed.data.boardId)
    .single();
  if (!column) return { error: "Coluna invalida." };

  const fromColumnId = existing.column_id;
  const { error } = await supabase
    .from("cards")
    .update({ column_id: parsed.data.columnId, position: parsed.data.position })
    .eq("id", parsed.data.cardId)
    .eq("board_id", parsed.data.boardId);
  if (error) {
    return { error: "Nao foi possivel mover o card." };
  }

  if (fromColumnId !== parsed.data.columnId) {
    await emitEvent(supabase, {
      org_id: existing.org_id,
      board_id: parsed.data.boardId,
      card_id: parsed.data.cardId,
      actor_id: user?.id ?? null,
      type: "moved",
      from_column_id: fromColumnId,
      to_column_id: parsed.data.columnId,
    });
  }

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
  if (isOrgAdminRole(orgMembership?.role)) return { ok: true, orgId: board.org_id };

  const { data: boardMember } = await supabase
    .from("board_members")
    .select("role")
    .eq("board_id", boardId)
    .eq("user_id", userId)
    .maybeSingle();
  if (boardMember?.role === "manager") return { ok: true, orgId: board.org_id };

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

  revalidateHomeProjects();
  revalidateBoard(parsed.data.boardId);

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
    .update({ role: parsed.data.role })
    .eq("board_id", parsed.data.boardId)
    .eq("user_id", parsed.data.userId);

  if (error) return { ok: false, error: "Nao foi possivel atualizar o papel." };

  revalidateHomeProjects();
  revalidateBoard(parsed.data.boardId);
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

  revalidateHomeProjects();
  revalidateBoard(parsed.data.boardId);
  return { ok: true };
}

export async function acceptInvite(token: string): Promise<{ boardId?: string; error?: string }> {
  const result = await acceptBoardInviteByToken(token);
  if (result.boardId) {
    revalidateHomeProjects();
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
    orgId = board?.org_id ?? null;
  }
  if (!orgId) orgId = await getActiveOrgId();
  if (!orgId) return { error: "Sem organizacao." };

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
  const { data: board } = await supabase
    .from("boards")
    .select("tiflux_enabled")
    .eq("id", parsed.data.boardId)
    .single();
  if (!board?.tiflux_enabled) return { error: "Projeto nao vinculado ao Tiflux." };

  const token = process.env.TIFLUX_API_TOKEN;
  if (!token) return { error: "Integracao Tiflux nao configurada no servidor." };

  const { kind, query, deskId, clientId } = parsed.data;
  try {
    let options: TifluxOption[] = [];
    if (kind === "client") options = await searchTifluxClients(token, query);
    else if (kind === "desk") options = await searchTifluxDesks(token, query);
    else if (kind === "requestor") options = await searchTifluxRequestors(token, query, clientId);
    else if (kind === "user") options = await searchTifluxUsers(token, query);
    else if (kind === "priority") {
      if (!deskId) return { error: "Selecione a mesa primeiro." };
      options = await listTifluxDeskPriorities(token, deskId);
    } else if (kind === "services_catalog_item") {
      if (!deskId) return { error: "Selecione a mesa primeiro." };
      options = await listTifluxServicesCatalogItems(token, deskId, query);
    } else if (kind === "parent_ticket") {
      if (!deskId) return { error: "Selecione a mesa primeiro." };
      options = await searchTifluxParentTickets(token, deskId, query);
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

  const token = process.env.TIFLUX_API_TOKEN;
  if (!token) return { error: "Integracao Tiflux nao configurada no servidor." };

  let ticket: { ticketId: string; ticketNumber: string; raw: unknown };
  try {
    ticket = await callTifluxApi(parsed.data, token);
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

  const token = process.env.TIFLUX_API_TOKEN;
  if (!token) return { error: "Integracao Tiflux nao configurada no servidor." };

  let ticket: { ticketId: string; ticketNumber: string; raw: unknown };
  try {
    ticket = await getTifluxTicketByNumber(token, parsed.data.ticketNumber);
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
