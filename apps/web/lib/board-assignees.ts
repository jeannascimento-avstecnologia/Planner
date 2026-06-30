import type { ProfileRow } from "@/components/board/types";

export function collectAssigneeUserIds(
  orgMemberUserIds: string[],
  boardMemberUserIds: string[],
): string[] {
  return [...new Set([...orgMemberUserIds, ...boardMemberUserIds])];
}

export function buildProfilesById(profiles: ProfileRow[]): Record<string, ProfileRow> {
  const profilesById: Record<string, ProfileRow> = {};
  for (const p of profiles) profilesById[p.id] = p;
  return profilesById;
}

export function sortAssigneeProfiles(profiles: ProfileRow[]): ProfileRow[] {
  return [...profiles].sort((a, b) => {
    const nameA = (a.full_name ?? a.id).toLowerCase();
    const nameB = (b.full_name ?? b.id).toLowerCase();
    return nameA.localeCompare(nameB, "pt-BR");
  });
}
