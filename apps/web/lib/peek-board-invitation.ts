import { createClient } from "@/lib/supabase/server";

export type PeekBoardInvitation = {
  email: string;
  boardName: string;
};

export async function peekBoardInvitation(token: string): Promise<PeekBoardInvitation | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("peek_board_invitation", { p_token: token });
  if (error || !data || !Array.isArray(data) || data.length === 0) return null;
  const row = data[0] as { email?: string | null; board_name?: string | null };
  if (!row.email) return null;
  return { email: row.email, boardName: row.board_name ?? "projeto" };
}
