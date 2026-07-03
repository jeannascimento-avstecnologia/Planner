import { createClient } from "@/lib/supabase/server";
import { NotificationBell, type NotificationItem } from "./notification-bell";

type Props = {
  userId: string;
  variant?: "sidebar" | "topbar";
};

export async function NotificationsLoader({ userId, variant = "topbar" }: Props) {
  const supabase = await createClient();
  const { data: notifs } = await supabase
    .from("notifications")
    .select("id, type, title, body, entity_type, entity_id, board_id, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  const notifications: NotificationItem[] = (notifs ?? []) as NotificationItem[];
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return <NotificationBell notifications={notifications} unreadCount={unreadCount} variant={variant} />;
}
