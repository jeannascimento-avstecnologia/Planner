"use client";

import { useEffect, useState } from "react";
import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";
import { OnboardingTourProvider, useOnboardingTour } from "@/components/onboarding/onboarding-tour-provider";
import { PageTourAutoTrigger } from "@/components/onboarding/page-tour-auto-trigger";
import type { ShellCacheData } from "@/lib/loaders/shell-cache";

type Props = {
  userEmail: string;
  shellData: ShellCacheData;
  hasActiveOrg: boolean;
  notificationsSlot: React.ReactNode;
  children: React.ReactNode;
};

/** Deve renderizar somente dentro de OnboardingTourProvider. */
function ShellChrome({
  shellData,
  userEmail,
  mobileOpen,
  setMobileOpen,
}: {
  shellData: ShellCacheData;
  userEmail: string;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}) {
  const { notifyShowWorkload, setPageTourContext } = useOnboardingTour();

  useEffect(() => {
    notifyShowWorkload(shellData.showWorkload);
    setPageTourContext({
      showWorkload: shellData.showWorkload,
      showAdminSettings: shellData.showAdminSettings,
    });
  }, [
    notifyShowWorkload,
    setPageTourContext,
    shellData.showWorkload,
    shellData.showAdminSettings,
  ]);

  return (
    <AppSidebar
      userEmail={userEmail}
      mobileOpen={mobileOpen}
      setMobileOpen={setMobileOpen}
      accessibleBoardIds={shellData.accessibleBoardIds}
      boardMetaById={shellData.boardMetaById}
      showWorkload={shellData.showWorkload}
    />
  );
}

export function AppShellStreaming({
  userEmail,
  shellData,
  hasActiveOrg,
  notificationsSlot,
  children,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!shellData) {
    throw new Error("AppShellStreaming: shellData ausente — aguarde loadShellDataCached no server.");
  }

  return (
    <OnboardingTourProvider setMobileOpen={setMobileOpen} hasActiveOrg={hasActiveOrg}>
      <PageTourAutoTrigger />
      <div className="flex min-h-screen">
        <ShellChrome
          shellData={shellData}
          userEmail={userEmail}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />
        <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
          <AppTopbar
            notificationsSlot={notificationsSlot}
            avatarUrl={shellData.avatarUrl}
            fullName={shellData.fullName}
            onOpenMobileMenu={() => setMobileOpen(true)}
          />
          <main className="flex-1 overflow-x-hidden p-3 sm:p-4">{children}</main>
        </div>
      </div>
    </OnboardingTourProvider>
  );
}
