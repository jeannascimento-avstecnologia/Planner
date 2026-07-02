import { createClient } from "@/lib/supabase/server";

export async function acceptOrgInviteByToken(token: string): Promise<{ orgId?: string; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_org_invitation", { p_token: token });
  if (error) return { error: error.message };
  if (typeof data === "string") return { orgId: data };
  return { error: "Nao foi possivel aceitar o convite." };
}
