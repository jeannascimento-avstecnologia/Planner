"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Bell, Clock, FolderPlus, UserPlus } from "lucide-react";
import { markAllNotificationsRead, markNotificationRead } from "@/app/(app)/notifications/actions";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
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

export function NotificationBell({ notifications, unreadCount, variant = "sidebar" }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [, startTransition] = useTransition();
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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
        const width = 288;
        const left =
          variant === "topbar"
            ? Math.min(r.right - width, window.innerWidth - width - 8)
            : Math.min(r.left, window.innerWidth - width - 8);
        setPos({ top: Math.min(r.bottom + 4, window.innerHeight - 360), left: Math.max(8, left) });
      }
    }
    setOpen((o) => !o);
  }

  function openItem(n: NotificationItem) {
    setOpen(false);
    startTransition(async () => {
      if (!n.read_at) await markNotificationRead(n.id);
      const href = targetHref(n);
      if (href) router.push(href);
      router.refresh();
    });
  }

  function markAll() {
    startTransition(async () => {
      await markAllNotificationsRead();
      router.refresh();
    });
  }

  const isTopbar = variant === "topbar";

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-label="Notificacoes"
        title="Notificacoes"
        className={
          isTopbar
            ? `relative flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm transition hover:bg-white/90 text-aurora-fg dark:text-gray-900`
            : "relative flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-aurora-sidebar-muted transition hover:bg-white/5 hover:text-aurora-sidebar-fg"
        }
      >
        <Bell className="h-4 w-4 shrink-0" />
        {!isTopbar ? <span>Notificacoes</span> : null}
        {unreadCount > 0 ? (
          <span
            className={`flex h-4 min-w-4 items-center justify-center rounded-full bg-aurora-danger px-1 text-[10px] font-bold text-white ${
              isTopbar ? "absolute -right-0.5 -top-0.5" : "ml-auto"
            }`}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              style={{ position: "fixed", top: pos.top, left: pos.left, width: 288 }}
              className="z-[60] rounded-lg border border-aurora-border bg-aurora-surface p-2 shadow-xl"
            >
              <div className="mb-1 flex items-center justify-between px-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-aurora-muted">Notificacoes</p>
                {unreadCount > 0 ? (
                  <button type="button" onClick={markAll} className="text-[11px] text-aurora-accent hover:underline">
                    Marcar todas como lidas
                  </button>
                ) : null}
              </div>
              <ul className="max-h-80 space-y-0.5 overflow-y-auto">
                {notifications.length === 0 ? (
                  <li className="px-2 py-6 text-center text-xs text-aurora-muted">Sem notificacoes</li>
                ) : (
                  notifications.map((n) => {
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
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
