import { createClient } from "@/lib/supabase/server";

export type OrgInvitationStatus = "pending" | "accepted" | "expired" | "not_found";

export type ResolvedOrgInvitation = {
  status: OrgInvitationStatus;
  orgId: string | null;
  email: string | null;
  role: string | null;
};

export async function resolveOrgInvitation(token: string): Promise<ResolvedOrgInvitation | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("resolve_org_invitation", { p_token: token });
  if (error || !data || !Array.isArray(data) || data.length === 0) return null;
  const row = data[0] as {
    status?: string | null;
    org_id?: string | null;
    email?: string | null;
    role?: string | null;
  };
  const status = row.status as OrgInvitationStatus;
  if (!status) return null;
  return {
    status,
    orgId: row.org_id ?? null,
    email: row.email ?? null,
    role: row.role ?? null,
  };
}
