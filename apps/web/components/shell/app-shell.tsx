import { AppSidebar } from "./app-sidebar";
import type { NotificationItem } from "./notification-bell";

type Props = {
  userEmail: string;
  notifications: NotificationItem[];
  unreadCount: number;
  children: React.ReactNode;
};

export function AppShell({ userEmail, notifications, unreadCount, children }: Props) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar userEmail={userEmail} notifications={notifications} unreadCount={unreadCount} />
      <main className="min-w-0 flex-1 p-4 pt-14 md:pt-4">{children}</main>
    </div>
  );
}
