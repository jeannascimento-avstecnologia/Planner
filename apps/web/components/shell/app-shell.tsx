"use client";

import { useState } from "react";
import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";

type Props = {
  userEmail: string;
  avatarUrl?: string;
  fullName?: string;
  accessibleBoardIds: string[];
  notificationsSlot: React.ReactNode;
  children: React.ReactNode;
};

export function AppShell({
  userEmail,
  avatarUrl,
  fullName,
  accessibleBoardIds,
  notificationsSlot,
  children,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        userEmail={userEmail}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        accessibleBoardIds={accessibleBoardIds}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <AppTopbar
          notificationsSlot={notificationsSlot}
          avatarUrl={avatarUrl}
          fullName={fullName}
          onOpenMobileMenu={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-x-hidden p-3 sm:p-4">{children}</main>
      </div>
    </div>
  );
}
