import { cache } from "react";
import { Suspense } from "react";
import { getActiveOrgIdCached } from "@/lib/loaders/session";
import { loadShellDataCached } from "@/lib/loaders/shell-cache";
import { AppShellStreaming } from "./app-shell-streaming";
import { NotificationsLoader } from "./notifications-loader";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  userId: string;
  userEmail: string;
  children: React.ReactNode;
};

function NotificationFallback() {
  return <Skeleton className="h-9 w-9 rounded-full" aria-hidden />;
}

const getShellData = cache(async (userId: string) => {
  const orgId = await getActiveOrgIdCached();
  return loadShellDataCached(userId, orgId);
});

export async function AppShellLoader({ userId, userEmail, children }: Props) {
  const shellData = await getShellData(userId);

  return (
    <AppShellStreaming
      userEmail={userEmail}
      shellData={shellData}
      notificationsSlot={
        <Suspense fallback={<NotificationFallback />}>
          <NotificationsLoader userId={userId} variant="topbar" />
        </Suspense>
      }
    >
      {children}
    </AppShellStreaming>
  );
}
