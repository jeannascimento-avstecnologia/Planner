"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { OrgSettingsTabs } from "@/components/organization/OrgSettingsTabs";

type Props = {
  orgName: string;
  showAdminTabs: boolean;
  children: React.ReactNode;
};

export function SettingsRouteChrome({ orgName, showAdminTabs, children }: Props) {
  const pathname = usePathname();
  const isOrganizationsHub = pathname === "/settings/organizations" || pathname.startsWith("/settings/organizations/");

  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7735/ingest/ccfd0ebe-18ad-4f5a-9b22-eccef37739f9", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "fa60ca" },
      body: JSON.stringify({
        sessionId: "fa60ca",
        runId: "post-fix",
        hypothesisId: "H1-H5",
        location: "settings-route-chrome.tsx:mount",
        message: "settings layout chrome render",
        data: {
          pathname,
          isOrganizationsHub,
          orgName,
          showAdminTabs,
          rendersOrgHeader: !isOrganizationsHub,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [pathname, isOrganizationsHub, orgName, showAdminTabs]);

  if (isOrganizationsHub) {
    return (
      <div className="bg-aurora-bg -m-4 min-h-[calc(100vh-3.5rem)] p-4 md:-m-6 md:p-6">{children}</div>
    );
  }

  return (
    <div className="bg-aurora-bg -m-4 min-h-[calc(100vh-3.5rem)] p-4 md:-m-6 md:p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="space-y-1">
          <Link href="/boards" className="text-xs text-aurora-muted hover:text-aurora-fg">
            ← Voltar aos projetos
          </Link>
          <h1 className="text-2xl font-semibold text-aurora-fg">{orgName}</h1>
          <p className="text-sm text-aurora-muted">Gerencie membros, convites e configuracoes da organizacao.</p>
        </header>
        <OrgSettingsTabs showAdminTabs={showAdminTabs} />
        {children}
      </div>
    </div>
  );
}
