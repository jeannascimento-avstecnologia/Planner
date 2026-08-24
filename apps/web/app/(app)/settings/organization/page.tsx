import { redirect } from "next/navigation";

/** @deprecated Use /settings/users — redirect mantido para links legados. */
export default function OrganizationMembersRedirectPage() {
  redirect("/settings/users");
}
