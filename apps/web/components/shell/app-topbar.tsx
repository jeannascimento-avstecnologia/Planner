"use client";

import { Menu } from "lucide-react";
import { ThemeToggle } from "./theme-provider";
import { NotificationBell, type NotificationItem } from "./notification-bell";
import { TopbarTitle } from "./topbar-title";
import { AgifyLogo } from "./agify-logo";
import { ProfileMenu } from "./profile-menu";

type Props = {
  notifications: NotificationItem[];
  unreadCount: number;
  avatarUrl?: string;
  fullName?: string;
  onOpenMobileMenu?: () => void;
};

export function AppTopbar({
  notifications,
  unreadCount,
  avatarUrl,
  fullName,
  onOpenMobileMenu,
}: Props) {
  return (
    <header
      className="aurora-topbar-solid sticky top-0 z-20 grid h-14 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center overflow-hidden px-2 sm:px-3 md:px-4"
    >
      <div className="flex min-w-0 items-center gap-1.5 justify-self-start overflow-hidden">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="shrink-0 rounded-lg p-1.5 text-white/90 hover:bg-white/10 md:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0 truncate">
          <TopbarTitle />
        </div>
      </div>

      <div
        className="flex shrink-0 items-center justify-center justify-self-center px-1 md:px-2"
        data-testid="topbar-agify-logo"
      >
        <AgifyLogo variant="topbar" />
      </div>

      <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-1.5 justify-self-end">
        <NotificationBell notifications={notifications} unreadCount={unreadCount} variant="topbar" />
        <ThemeToggle variant="topbar" />
        <ProfileMenu avatarUrl={avatarUrl} fullName={fullName} />
      </div>
    </header>
  );
}
