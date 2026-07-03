"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Clock, FolderPlus, UserPlus } from "lucide-react";
import { markAllNotificationsRead, markNotificationRead } from "@/app/(app)/notifications/actions";
import { computeFixedPopoverPosition } from "@/lib/popover-position";
import { AuroraPopover } from "@/components/ui/aurora-popover";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  board_id?: string | null;
  read_at: string | null;
  created_at: string;
};

const ICONS: Record<string, typeof Bell> = {
  deadline_soon: Clock,
  member_added: UserPlus,
  card_created: FolderPlus,
};

function targetHref(n: NotificationItem): string | null {
  if (n.type === "deadline_soon") return "/calendar";
  if (n.entity_type === "board" && n.entity_id) return `/boards/${n.entity_id}`;
  if (n.entity_type === "card" && n.board_id && n.entity_id) return `/boards/${n.board_id}?cardId=${n.entity_id}`;
  return null;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

type Props = {
  notifications: NotificationItem[];
  unreadCount: number;
  variant?: "sidebar" | "topbar";
};

const NOTIF_PANEL_W = 288;
const NOTIF_PANEL_H = 360;

export function NotificationBell({ notifications, unreadCount, variant = "sidebar" }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [pending, startTransition] = useTransition();
  const [optimisticNotifs, markReadOptimistic] = useOptimistic(
    notifications,
    (state, action: { type: "one"; id: string } | { type: "all" }) => {
      const now = new Date().toISOString();
      if (action.type === "all") return state.map((n) => ({ ...n, read_at: n.read_at ?? now }));
      return state.map((n) => (n.id === action.id ? { ...n, read_at: n.read_at ?? now } : n));
    },
  );
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [badgePop, setBadgePop] = useState(false);
  const prevUnread = useRef(unreadCount);
  const displayUnread = optimisticNotifs.filter((n) => !n.read_at).length;

  useEffect(() => {
    if (unreadCount > prevUnread.current) {
      setBadgePop(true);
      const t = window.setTimeout(() => setBadgePop(false), 400);
      prevUnread.current = unreadCount;
      return () => window.clearTimeout(t);
    }
    prevUnread.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function toggle() {
    if (!open) {
      const r = btnRef.current?.getBoundingClientRect();
      if (r) {
        const next = computeFixedPopoverPosition(r, NOTIF_PANEL_W, NOTIF_PANEL_H);
        setPos({ top: next.top, left: next.left });
      }
    }
    setOpen((o) => !o);
  }

  function openItem(n: NotificationItem) {
    setOpen(false);
    startTransition(async () => {
      if (!n.read_at) {
        markReadOptimistic({ type: "one", id: n.id });
        await markNotificationRead(n.id);
      }
      const href = targetHref(n);
      if (href) router.push(href);
    });
  }

  function markAll() {
    startTransition(async () => {
      markReadOptimistic({ type: "all" });
      await markAllNotificationsRead();
    });
  }

  const isTopbar = variant === "topbar";
  const badgePopClass = badgePop ? "aurora-badge-pop" : "";

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-label="Notificacoes"
        title="Notificacoes"
        aria-busy={pending}
        className={
          isTopbar
            ? `relative flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm transition hover:bg-white/90 text-aurora-fg dark:text-gray-900 ${pending ? "opacity-70" : ""}`
            : `relative flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-aurora-sidebar-muted transition hover:bg-white/5 hover:text-aurora-sidebar-fg ${pending ? "opacity-70" : ""}`
        }
      >
        <Bell className="h-4 w-4 shrink-0" />
        {!isTopbar ? <span>Notificacoes</span> : null}
        {displayUnread > 0 ? (
          <span
            className={`flex h-4 min-w-4 items-center justify-center rounded-full bg-aurora-danger px-1 text-[10px] font-bold text-white ${badgePopClass} ${
              isTopbar ? "absolute -right-0.5 -top-0.5" : "ml-auto"
            }`}
          >
            {displayUnread > 9 ? "9+" : displayUnread}
          </span>
        ) : null}
      </button>

      <AuroraPopover
        open={open}
        testId="notification-popover"
        style={{ top: pos.top, left: pos.left, width: NOTIF_PANEL_W }}
        className="p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div ref={panelRef}>
          <div className="mb-1 flex items-center justify-between px-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-aurora-muted">Notificacoes</p>
            {displayUnread > 0 ? (
              <button type="button" onClick={markAll} disabled={pending} className="text-[11px] text-aurora-accent hover:underline disabled:opacity-60">
                Marcar todas como lidas
              </button>
            ) : null}
          </div>
          <ul className="max-h-80 space-y-0.5 overflow-y-auto">
            {optimisticNotifs.length === 0 ? (
              <li className="flex flex-col items-center gap-2 px-2 py-6 text-center text-xs text-aurora-muted">
                <Bell className="h-5 w-5 opacity-40" />
                Sem notificacoes
              </li>
            ) : (
              optimisticNotifs.map((n) => {
                const Icon = ICONS[n.type] ?? Bell;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => openItem(n)}
                      className={`flex w-full items-start gap-2 rounded-md px-2 py-2 text-left transition hover:bg-aurora-accent-muted/40 ${
                        n.read_at ? "opacity-60" : ""
                      }`}
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-aurora-accent" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-medium text-aurora-fg">{n.title}</span>
                          <span className="shrink-0 text-[10px] text-aurora-muted">{timeAgo(n.created_at)}</span>
                        </span>
                        {n.body ? <span className="block truncate text-xs text-aurora-muted">{n.body}</span> : null}
                      </span>
                      {!n.read_at ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-aurora-accent" /> : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </AuroraPopover>
    </>
  );
}
