import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "./app-shell";
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

export async function AppShellLoader({ userId, userEmail, children }: Props) {
  const supabase = await createClient();
  const [{ data: profile }, { data: accessibleBoards }] = await Promise.all([
    supabase.from("profiles").select("avatar_url, full_name").eq("id", userId).single(),
    supabase.from("boards").select("id"),
  ]);

  return (
    <AppShell
      userEmail={userEmail}
      avatarUrl={profile?.avatar_url ?? ""}
      fullName={profile?.full_name ?? ""}
      accessibleBoardIds={(accessibleBoards ?? []).map((b) => b.id)}
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
