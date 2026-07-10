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

const getShellDataPromise = cache((userId: string) =>
  (async () => {
    const orgId = await getActiveOrgIdCached();
    return loadShellDataCached(userId, orgId);
  })(),
);

export function AppShellLoader({ userId, userEmail, children }: Props) {
  const shellPromise = getShellDataPromise(userId);

  return (
    <AppShellStreaming
      userEmail={userEmail}
      shellPromise={shellPromise}
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
