import Link from "next/link";
import { redirect } from "next/navigation";
import { OrgSettingsTabs } from "@/components/organization/OrgSettingsTabs";
import { loadOrgSettingsContext } from "@/lib/load-org-settings";

export default async function OrganizationSettingsLayout({ children }: { children: React.ReactNode }) {
  const ctx = await loadOrgSettingsContext();
  if (!ctx) redirect("/login");

  return (
    <div className="bg-aurora-bg -m-4 min-h-[calc(100vh-3.5rem)] p-4 md:-m-6 md:p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="space-y-1">
          <Link href="/boards" className="text-xs text-aurora-muted hover:text-aurora-fg">
            ← Voltar aos projetos
          </Link>
          <h1 className="text-2xl font-semibold text-aurora-fg">{ctx.orgName}</h1>
          <p className="text-sm text-aurora-muted">Gerencie membros, convites e configuracoes da organizacao.</p>
        </header>
        <OrgSettingsTabs />
        {children}
      </div>
    </div>
  );
}
