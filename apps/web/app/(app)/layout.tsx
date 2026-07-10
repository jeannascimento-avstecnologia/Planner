import { Suspense } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/loaders/session";
import { AppShellLoader } from "@/components/shell/app-shell-loader";
import { PageSkeleton } from "@/components/ui/skeleton";
import { PLANNER_SYNC_DEADLINES_HEADER } from "@/lib/planner-headers";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const h = await headers();
  if (h.get(PLANNER_SYNC_DEADLINES_HEADER) === "1") {
    after(async () => {
      try {
        const supabase = await createClient();
        await supabase.rpc("sync_deadline_notifications");
      } catch {
        /* nao bloqueia render */
      }
    });
  }

  return (
    <AppShellLoader userId={user.id} userEmail={user.email ?? ""}>
      <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
    </AppShellLoader>
  );
}
