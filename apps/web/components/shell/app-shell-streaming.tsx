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

  // #region agent log
  useEffect(() => {
    fetch("http://127.0.0.1:7753/ingest/8f86d503-56e3-4323-8498-bfd2c5e951ff", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "3ef40b" },
      body: JSON.stringify({
        sessionId: "3ef40b",
        runId: "post-fix-v2",
        hypothesisId: "H6",
        location: "app-shell-streaming.tsx:ShellChrome",
        message: "ShellChrome mounted with context",
        data: { buildMarker: "shell-v3-static-tour", hasShellData: shellData != null },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }, [shellData]);
  // #endregion

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

export function AppShellStreaming({ userEmail, shellData, notificationsSlot, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!shellData) {
    throw new Error("AppShellStreaming: shellData ausente — aguarde loadShellDataCached no server.");
  }

  return (
    <OnboardingTourProvider setMobileOpen={setMobileOpen}>
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
