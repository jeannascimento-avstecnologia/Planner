/** Spec E: org manager, admin ou owner. */
export function canViewWorkload(orgRole?: string | null): boolean {
  return orgRole === "owner" || orgRole === "admin" || orgRole === "manager";
}
