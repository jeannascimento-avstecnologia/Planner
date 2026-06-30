"use client";

import { useState } from "react";
import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";
import type { NotificationItem } from "./notification-bell";

type Props = {
  userEmail: string;
  avatarUrl?: string;
  fullName?: string;
  notifications: NotificationItem[];
  unreadCount: number;
  accessibleBoardIds: string[];
  children: React.ReactNode;
};

export function AppShell({
  userEmail,
  avatarUrl,
  fullName,
  notifications,
  unreadCount,
  accessibleBoardIds,
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
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar
          notifications={notifications}
          unreadCount={unreadCount}
          avatarUrl={avatarUrl}
          fullName={fullName}
          onOpenMobileMenu={() => setMobileOpen(true)}
        />
        <main className="flex-1 p-4">{children}</main>
      </div>
    </div>
  );
}
