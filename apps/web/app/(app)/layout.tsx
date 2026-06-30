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
    .select("id, type, title, body, entity_type, entity_id, board_id, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_url, full_name")
    .eq("id", user.id)
    .single();

  const { data: accessibleBoards } = await supabase.from("boards").select("id");
  const accessibleBoardIds = (accessibleBoards ?? []).map((b) => b.id);

  const notifications: NotificationItem[] = (notifs ?? []) as NotificationItem[];
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <AppShell
      userEmail={user.email ?? ""}
      avatarUrl={profile?.avatar_url ?? ""}
      fullName={profile?.full_name ?? ""}
      notifications={notifications}
      unreadCount={unreadCount}
      accessibleBoardIds={accessibleBoardIds}
    >
      {children}
    </AppShell>
  );
}
