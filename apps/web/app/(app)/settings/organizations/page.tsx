import { redirect } from "next/navigation";
import { OrganizationsPanel } from "@/components/organizations/OrganizationsPanel";
import { loadOrganizationsOverview } from "@/lib/load-organizations-overview";

export const dynamic = "force-dynamic";

export default async function OrganizationsHubPage() {
  const data = await loadOrganizationsOverview();
  if (!data) redirect("/login");

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6" data-testid="organizations-hub-page">
      <OrganizationsPanel key={data.orgs.map((o) => o.orgId).join("-")} data={data} />
    </div>
  );
}
