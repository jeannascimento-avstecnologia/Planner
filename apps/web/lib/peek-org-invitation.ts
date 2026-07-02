import { createClient } from "@/lib/supabase/server";

export async function peekOrgInvitation(token: string): Promise<{ email: string } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("peek_org_invitation", { p_token: token });
  if (error || !data || !Array.isArray(data) || data.length === 0) return null;
  const row = data[0] as { email?: string | null };
  if (!row.email) return null;
  return { email: row.email };
}
