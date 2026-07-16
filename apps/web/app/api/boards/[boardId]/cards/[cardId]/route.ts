import { NextResponse } from "next/server";
import { uuid } from "@nextgen/contracts";
import { createClient } from "@/lib/supabase/server";
import { deleteCardMutation } from "@/lib/card-kernel";

type RouteCtx = { params: Promise<{ boardId: string; cardId: string }> };

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
