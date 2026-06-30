import { createClient } from "@/lib/supabase/server";

export type BoardInvitationStatus = "pending" | "accepted" | "expired" | "not_found";

export type ResolvedBoardInvitation = {
  status: BoardInvitationStatus;
  boardId: string | null;
  email: string | null;
};

export async function resolveBoardInvitation(token: string): Promise<ResolvedBoardInvitation | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("resolve_board_invitation", { p_token: token });
  if (error || !data || !Array.isArray(data) || data.length === 0) return null;
  const row = data[0] as { status?: string | null; board_id?: string | null; email?: string | null };
  const status = row.status as BoardInvitationStatus;
  if (!status) return null;
  return {
    status,
    boardId: row.board_id ?? null,
    email: row.email ?? null,
  };
}
