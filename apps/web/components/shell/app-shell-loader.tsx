import { getActiveOrgIdCached } from "@/lib/loaders/session";
import { loadShellDataCached } from "@/lib/loaders/shell-cache";
import { AppShell } from "./app-shell";
import { NotificationsLoader } from "./notifications-loader";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";

type Props = {
  userId: string;
  userEmail: string;
  children: React.ReactNode;
};

function NotificationFallback() {
  return <Skeleton className="h-9 w-9 rounded-full" aria-hidden />;
}

export async function AppShellLoader({ userId, userEmail, children }: Props) {
  const orgId = await getActiveOrgIdCached();
  const shell = await loadShellDataCached(userId, orgId);

  return (
    <AppShell
      userEmail={userEmail}
      avatarUrl={shell.avatarUrl}
      fullName={shell.fullName}
      accessibleBoardIds={shell.accessibleBoardIds}
      boardMetaById={shell.boardMetaById}
      showWorkload={shell.showWorkload}
      notificationsSlot={
        <Suspense fallback={<NotificationFallback />}>
          <NotificationsLoader userId={userId} variant="topbar" />
        </Suspense>
      }
    >
      {children}
    </AppShell>
  );
}
