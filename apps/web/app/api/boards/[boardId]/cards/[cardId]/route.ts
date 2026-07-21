import { NextResponse } from "next/server";
import { uuid } from "@nextgen/contracts";
import { createClient } from "@/lib/supabase/server";
import { deleteCardMutation } from "@/lib/card-kernel";
import { setCardStageMutation } from "@/lib/card-kernel/set-card-stage";

type RouteCtx = { params: Promise<{ boardId: string; cardId: string }> };

/** PATCH card fields (stage) — Route Handler (evita UnrecognizedActionError pos-HMR). */
export async function PATCH(req: Request, ctx: RouteCtx) {
  const { boardId, cardId } = await ctx.params;
  if (!uuid.safeParse(boardId).success || !uuid.safeParse(cardId).success) {
    return NextResponse.json({ error: "Dados invalidos." }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as { stageId?: string | null } | null;
  if (!body || !("stageId" in body)) {
    return NextResponse.json({ error: "Dados invalidos." }, { status: 400 });
  }
  if (body.stageId !== null && body.stageId !== undefined && !uuid.safeParse(body.stageId).success) {
    return NextResponse.json({ error: "Dados invalidos." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const result = await setCardStageMutation(
    supabase,
    { cardId, boardId, stageId: body.stageId ?? null },
    { userId: user.id },
  );
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true as const });
}

/** DELETE card — Route Handler (evita "Failed to find Server Action" pos-HMR/restart). */
export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { boardId, cardId } = await ctx.params;
  if (!uuid.safeParse(boardId).success || !uuid.safeParse(cardId).success) {
    return NextResponse.json({ error: "Dados invalidos." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const result = await deleteCardMutation(supabase, { cardId, boardId });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true as const });
}
