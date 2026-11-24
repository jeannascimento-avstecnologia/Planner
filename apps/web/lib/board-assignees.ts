import type { ProfileRow } from "@/components/board/types";

export type AssigneeAccessInput = {
  departmentId: string | null;
  createdBy: string | null;
  orgMemberIds: string[];
  orgOwnerIds: string[];
  departmentMemberIds: string[];
  boardMemberIds: string[];
};

/** Espelha `app.can_access_board_as`: Geral = org; dept = owner + dept + board_members + criador. */
export function collectAssignableUserIds(input: AssigneeAccessInput): string[] {
  const ids = new Set<string>();
  if (input.createdBy) ids.add(input.createdBy);
  for (const id of input.boardMemberIds) ids.add(id);
  if (input.departmentId == null) {
    for (const id of input.orgMemberIds) ids.add(id);
  } else {
    for (const id of input.orgOwnerIds) ids.add(id);
    for (const id of input.departmentMemberIds) ids.add(id);
  }
  return [...ids];
}

export function collectAssigneeUserIds(
  orgMemberUserIds: string[],
  boardMemberUserIds: string[],
): string[] {
  return collectAssignableUserIds({
    departmentId: null,
    createdBy: null,
    orgMemberIds: orgMemberUserIds,
    orgOwnerIds: [],
    departmentMemberIds: [],
    boardMemberIds: boardMemberUserIds,
  });
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
