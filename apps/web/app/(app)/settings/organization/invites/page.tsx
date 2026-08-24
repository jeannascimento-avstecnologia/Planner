import { redirect } from "next/navigation";

/** @deprecated Convites integrados em /settings/users — redirect mantido para links legados. */
export default function OrganizationInvitesRedirectPage() {
  redirect("/settings/users#convites");
}
