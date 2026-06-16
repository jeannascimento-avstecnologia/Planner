"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  attachTagInput,
  createCardInput,
  createColumnInput,
  createTagInput,
  detachTagInput,
  inviteBoardInput,
  updateCardInput,
  type Json,
} from "@nextgen/contracts";
import { lexoPosition } from "@/lib/fractional";
import { TAG_DEFAULT_COLORS } from "@/lib/ui-classes";
import { makeSecureToken } from "@/lib/tokens";

async function emitEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  payload: {
    org_id: string;
    board_id: string;
    card_id: string;
    actor_id: string | null;
    type: "created" | "updated" | "assigned" | "due_changed" | "priority_changed";
    metadata?: Record<string, unknown>;
  },
) {
  await supabase.from("card_events").insert({
    org_id: payload.org_id,
    board_id: payload.board_id,
    card_id: payload.card_id,
    actor_id: payload.actor_id,
    type: payload.type,
    metadata: (payload.metadata ?? {}) as Json,
  });
}

export async function createColumn(formData: FormData): Promise<void> {
  const parsed = createColumnInput.safeParse({
    boardId: formData.get("boardId"),
    name: formData.get("name"),
  });
  if (!parsed.success) return;

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
  revalidatePath(`/boards/${parsed.data.boardId}`);
}

export async function createCard(formData: FormData): Promise<void> {
  const dueRaw = formData.get("dueDate");
  const parsed = createCardInput.safeParse({
    boardId: formData.get("boardId"),
    columnId: formData.get("columnId"),
    title: formData.get("title"),
    priority: formData.get("priority") || undefined,
    dueDate: dueRaw && String(dueRaw) !== "" ? `${dueRaw}T12:00:00.000Z` : undefined,
    assigneeId: formData.get("assigneeId") || undefined,
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: board } = await supabase
    .from("boards")
    .select("org_id")
    .eq("id", parsed.data.boardId)
    .single();
  if (!board) return;

  const { data: card, error } = await supabase
    .from("cards")
    .insert({
      board_id: parsed.data.boardId,
      column_id: parsed.data.columnId,
      org_id: board.org_id,
      title: parsed.data.title,
      priority: parsed.data.priority,
      due_date: parsed.data.dueDate ?? null,
      assignee_id: parsed.data.assigneeId ?? null,
      position: lexoPosition(),
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (!error && card) {
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
  }
  revalidatePath(`/boards/${parsed.data.boardId}`);
}

export async function updateCard(formData: FormData): Promise<void> {
  const dueRaw = formData.get("dueDate");
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
    assigneeId: assigneeRaw === "" ? null : assigneeRaw || undefined,
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing } = await supabase
    .from("cards")
    .select("org_id, priority, due_date, assignee_id")
    .eq("id", parsed.data.cardId)
    .single();
  if (!existing) return;

  const patch: {
    title?: string;
    description?: string | null;
    priority?: typeof parsed.data.priority;
    due_date?: string | null;
    assignee_id?: string | null;
  } = {};
  if (parsed.data.title !== undefined) patch.title = parsed.data.title;
  if (parsed.data.description !== undefined) patch.description = parsed.data.description;
  if (parsed.data.priority !== undefined) patch.priority = parsed.data.priority;
  if (parsed.data.dueDate !== undefined) patch.due_date = parsed.data.dueDate;
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

  revalidatePath(`/boards/${parsed.data.boardId}`);
  revalidatePath("/calendar");
}

export async function createTag(formData: FormData): Promise<void> {
  const orgId = String(formData.get("orgId") ?? "");
  const parsed = createTagInput.safeParse({
    name: formData.get("name"),
    color: formData.get("color") || TAG_DEFAULT_COLORS[0],
  });
  if (!parsed.success || !orgId) return;

  const supabase = await createClient();
  await supabase.from("tags").insert({
    org_id: orgId,
    name: parsed.data.name,
    color: parsed.data.color,
  });
  const boardId = formData.get("boardId");
  if (boardId) revalidatePath(`/boards/${boardId}`);
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
  revalidatePath(`/boards/${parsed.data.boardId}`);
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
  revalidatePath(`/boards/${parsed.data.boardId}`);
}

export type InviteResult = { ok: true; inviteUrl?: string; added?: boolean } | { ok: false; error: string };

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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return { ok: true, inviteUrl: `${appUrl}/invite?token=${token}` };
}

export async function acceptInvite(token: string): Promise<{ boardId?: string; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_board_invitation", { p_token: token });
  if (error) return { error: error.message };
  revalidatePath("/boards");
  return { boardId: data as string };
}

export async function createIcalFeedToken(boardId?: string): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nao autenticado." };

  const { data: memberships } = await supabase.from("memberships").select("org_id").limit(1);
  const orgId = memberships?.[0]?.org_id;
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
