import "server-only";

import { tryCreateServiceClient } from "@/lib/supabase/service";

export type RecipientProfile = {
  email: string;
  fullName: string;
};

export async function getRecipientProfile(userId: string): Promise<RecipientProfile | null> {
  const service = tryCreateServiceClient();
  if (!service) return null;

  const [{ data: profile }, { data: authData }] = await Promise.all([
    service.from("profiles").select("full_name, backup_email").eq("id", userId).maybeSingle(),
    service.auth.admin.getUserById(userId),
  ]);

  const primary = authData?.user?.email?.trim();
  const backup = profile?.backup_email?.trim();
  const email = primary || backup;
  if (!email) return null;

  return {
    email,
    fullName: profile?.full_name?.trim() || primary || email,
  };
}

export async function getRecipientProfiles(userIds: string[]): Promise<Map<string, RecipientProfile>> {
  const unique = [...new Set(userIds)];
  const map = new Map<string, RecipientProfile>();
  await Promise.all(
    unique.map(async (id) => {
      const profile = await getRecipientProfile(id);
      if (profile) map.set(id, profile);
    }),
  );
  return map;
}
