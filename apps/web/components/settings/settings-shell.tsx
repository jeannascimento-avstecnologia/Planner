"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { PlanningPageHeader } from "@/components/shell/planning-page-header";
import { PAGE_COPY } from "@/lib/page-copy";
import { SettingsNav } from "@/components/settings/settings-nav";
import { SettingsOrgSwitcher } from "@/components/settings/settings-org-switcher";
import type { UserOrgRow } from "@/lib/active-org-constants";
import { dataPanelClass, dataPanelEnterClass } from "@/lib/ui-classes";

type Props = {
  orgId: string;
  orgName: string;
  orgLogoUrl: string | null;
  userFullName: string | null;
  userEmail: string;
  userRole: string;
  userOrgs: UserOrgRow[];
  showAdminTabs: boolean;
  children: React.ReactNode;
};

export function SettingsShell({
  orgId,
  orgName,
  orgLogoUrl,
  userFullName,
  userEmail,
  userRole,
  userOrgs,
  showAdminTabs,
  children,
}: Props) {
  return (
    <div className="bg-aurora-bg -m-4 min-h-[calc(100vh-3.5rem)] p-4 md:-m-6 md:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <PlanningPageHeader
          backHref="/boards"
          backLabel="Projetos"
          title="Configuracoes"
          description={PAGE_COPY.settingsShell.description}
          icon={<Settings className="h-5 w-5" />}
        />

        <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <SettingsOrgSwitcher
              activeOrgId={orgId}
              activeOrgName={orgName}
              activeOrgLogoUrl={orgLogoUrl}
              orgs={userOrgs}
            />
            <SettingsNav
              showAdminTabs={showAdminTabs}
              userFullName={userFullName}
              userEmail={userEmail}
              userRole={userRole}
              mobile
            />
            <SettingsNav
              showAdminTabs={showAdminTabs}
              userFullName={userFullName}
              userEmail={userEmail}
              userRole={userRole}
            />
            <Link
              href="/settings/organizations"
              className="hidden text-xs text-aurora-brand hover:underline lg:inline-block"
              data-testid="settings-manage-all-orgs"
            >
              Gerenciar todas as organizacoes →
            </Link>
          </aside>

          <main className={`${dataPanelClass} ${dataPanelEnterClass} min-w-0 p-4 md:p-6`} data-testid="settings-main-panel">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
