"use client";

import { Suspense, use, useState } from "react";
import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";
import { Skeleton } from "@/components/ui/skeleton";
import type { ShellCacheData } from "@/lib/loaders/shell-cache";

type Props = {
  userEmail: string;
  shellPromise: Promise<ShellCacheData>;
  notificationsSlot: React.ReactNode;
  children: React.ReactNode;
};

function SidebarFallback() {
  return <Skeleton className="hidden h-screen w-14 shrink-0 md:block lg:w-56" aria-hidden />;
}

function TopbarProfileFallback() {
  return <Skeleton className="h-9 w-9 rounded-full" aria-hidden />;
}

function ShellChrome({
  shellPromise,
  userEmail,
  mobileOpen,
  setMobileOpen,
}: {
  shellPromise: Promise<ShellCacheData>;
  userEmail: string;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}) {
  const shell = use(shellPromise);

  return (
    <AppSidebar
      userEmail={userEmail}
      mobileOpen={mobileOpen}
      setMobileOpen={setMobileOpen}
      accessibleBoardIds={shell.accessibleBoardIds}
      boardMetaById={shell.boardMetaById}
      showWorkload={shell.showWorkload}
    />
  );
}

function ShellTopbarProfile({
  shellPromise,
  notificationsSlot,
  onOpenMobileMenu,
}: {
  shellPromise: Promise<ShellCacheData>;
  notificationsSlot: React.ReactNode;
  onOpenMobileMenu: () => void;
}) {
  const shell = use(shellPromise);

  return (
    <AppTopbar
      notificationsSlot={notificationsSlot}
      avatarUrl={shell.avatarUrl}
      fullName={shell.fullName}
      onOpenMobileMenu={onOpenMobileMenu}
    />
  );
}

/** Shell com chrome em Suspense — main content renderiza sem aguardar loadShellDataCached. */
export function AppShellStreaming({ userEmail, shellPromise, notificationsSlot, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Suspense fallback={<SidebarFallback />}>
        <ShellChrome
          shellPromise={shellPromise}
          userEmail={userEmail}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <Suspense
          fallback={
            <header className="aurora-topbar-solid sticky top-0 z-40 grid h-14 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-2 sm:px-3 md:px-4">
              <div />
              <div />
              <div className="flex items-center justify-end gap-1.5">
                {notificationsSlot}
                <TopbarProfileFallback />
              </div>
            </header>
          }
        >
          <ShellTopbarProfile
            shellPromise={shellPromise}
            notificationsSlot={notificationsSlot}
            onOpenMobileMenu={() => setMobileOpen(true)}
          />
        </Suspense>
        <main className="flex-1 overflow-x-hidden p-3 sm:p-4">{children}</main>
      </div>
    </div>
  );
}
