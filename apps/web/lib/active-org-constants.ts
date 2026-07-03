export const ACTIVE_ORG_COOKIE = "ngp:active-org";

export type UserOrgRow = {
  orgId: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  role: import("@nextgen/contracts").Database["public"]["Enums"]["membership_role"];
  isOwner: boolean;
};
