import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/app-shell";
import type { NotificationItem } from "@/components/shell/notification-bell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Gera notificacoes de prazo (idempotente) e carrega o inbox do usuario.
  await supabase.rpc("sync_deadline_notifications");
  const { data: notifs } = await supabase
    .from("notifications")
    .select("id, type, title, body, entity_type, entity_id, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const notifications: NotificationItem[] = (notifs ?? []) as NotificationItem[];
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <AppShell userEmail={user.email ?? ""} notifications={notifications} unreadCount={unreadCount}>
      {children}
    </AppShell>
  );
}
