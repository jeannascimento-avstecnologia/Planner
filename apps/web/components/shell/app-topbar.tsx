"use client";

import { Menu } from "lucide-react";
import { ThemeToggle } from "./theme-provider";
import { NotificationBell, type NotificationItem } from "./notification-bell";
import { TopbarTitle } from "./topbar-title";
import { AvsLogo } from "./avs-logo";
import { ProfileMenu } from "./profile-menu";

type Props = {
  notifications: NotificationItem[];
  unreadCount: number;
  avatarUrl?: string;
  fullName?: string;
  onOpenMobileMenu?: () => void;
};

export function AppTopbar({ notifications, unreadCount, avatarUrl, fullName, onOpenMobileMenu }: Props) {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center border-b border-white/10 bg-aurora-topbar-bg px-3 md:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="rounded-lg p-1.5 text-white/90 hover:bg-white/10 md:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <TopbarTitle />
      </div>

      <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
        <AvsLogo variant="topbar" />
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-end gap-1.5">
        <NotificationBell notifications={notifications} unreadCount={unreadCount} variant="topbar" />
        <ThemeToggle variant="topbar" />
        <ProfileMenu avatarUrl={avatarUrl} fullName={fullName} />
      </div>
    </header>
  );
}
