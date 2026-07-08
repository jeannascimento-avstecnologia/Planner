import { createClient } from "@/lib/supabase/server";
import { listUserOrgs } from "@/lib/active-org";
import { loadOrgSettingsContext, type OrgSettingsContext } from "@/lib/load-org-settings";
import type { UserOrgRow } from "@/lib/active-org-constants";

export type SettingsShellData = OrgSettingsContext & {
  userFullName: string | null;
  userEmail: string;
  userOrgs: UserOrgRow[];
};

export async function loadSettingsShellData(): Promise<SettingsShellData | null> {
  const ctx = await loadOrgSettingsContext();
  if (!ctx) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const userOrgs = await listUserOrgs();

  return {
    ...ctx,
    userFullName: profile?.full_name ?? null,
    userEmail: user.email ?? "",
    userOrgs,
  };
}
