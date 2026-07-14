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

  // #region agent log
  fetch("http://127.0.0.1:7753/ingest/8f86d503-56e3-4323-8498-bfd2c5e951ff", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "3ef40b" },
    body: JSON.stringify({
      sessionId: "3ef40b",
      hypothesisId: "H1,H4",
      location: "app-shell-loader.tsx:27",
      message: "server shellData resolved",
      data: {
        buildMarker: "shell-v2-no-use-promise",
        hasShellData: shellData != null,
        keys: shellData ? Object.keys(shellData) : null,
        showWorkload: shellData?.showWorkload ?? null,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

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
