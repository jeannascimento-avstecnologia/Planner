import { createClient } from "@/lib/supabase/server";

export async function acceptBoardInviteByToken(
  token: string,
): Promise<{ boardId?: string; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_board_invitation", { p_token: token });
  if (error) return { error: error.message };
  return { boardId: data as string };
}
