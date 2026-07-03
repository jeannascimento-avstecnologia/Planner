import { Suspense } from "react";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/loaders/session";
import { AppShellLoader } from "@/components/shell/app-shell-loader";
import { ShellSkeleton } from "@/components/ui/skeleton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  after(async () => {
    try {
      const supabase = await createClient();
      await supabase.rpc("sync_deadline_notifications");
    } catch {
      /* nao bloqueia render */
    }
  });

  return (
    <Suspense fallback={<ShellSkeleton />}>
      <AppShellLoader userId={user.id} userEmail={user.email ?? ""}>
        {children}
      </AppShellLoader>
    </Suspense>
  );
}
