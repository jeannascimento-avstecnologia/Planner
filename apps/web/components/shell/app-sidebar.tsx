"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, FolderKanban, Menu, User, X } from "lucide-react";
import { signOut } from "@/app/(auth)/auth-actions";
import { RecentProjects } from "./recent-projects";
import { ThemeToggle } from "./theme-provider";
import { NotificationBell, type NotificationItem } from "./notification-bell";

type Props = {
  userEmail: string;
  notifications: NotificationItem[];
  unreadCount: number;
};

const COLLAPSE_KEY = "ngp:sidebar-collapsed";

export function AppSidebar({ userEmail, notifications, unreadCount }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(COLLAPSE_KEY) === "false") setCollapsed(false);
    } catch {
      // ignore
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  // No mobile (drawer aberto) sempre mostra conteudo expandido.
  const tight = collapsed && !mobileOpen;

  const nav = [
    { href: "/boards", label: "Projetos", icon: FolderKanban },
    { href: "/calendar", label: "Calendario", icon: Calendar },
  ];

  const sidebarContent = (
    <>
      <div className={`flex items-center gap-1 ${tight ? "flex-col" : "justify-between"}`}>
        {!tight ? (
          <Link href="/boards" className="text-sm font-semibold text-aurora-fg">
            NextGen Planner
          </Link>
        ) : null}
        <div className={`flex items-center gap-1 ${tight ? "flex-col" : ""}`}>
          <ThemeToggle collapsed={tight} />
          <button
            type="button"
            onClick={toggleCollapsed}
            className="hidden rounded p-1 text-aurora-muted hover:bg-aurora-accent-muted md:block"
            aria-label={collapsed ? "Expandir" : "Recolher"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded p-1 md:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <nav className="mt-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href === "/boards" && pathname.startsWith("/boards"));
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              title={tight ? label : undefined}
              className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition ${
                active ? "bg-aurora-accent-muted text-aurora-accent" : "text-aurora-fg hover:bg-aurora-accent-muted/50"
              } ${tight ? "justify-center" : ""}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!tight ? label : null}
            </Link>
          );
        })}

        <NotificationBell notifications={notifications} unreadCount={unreadCount} collapsed={tight} />

        <Link
          href="/profile"
          onClick={() => setMobileOpen(false)}
          title={tight ? "Perfil" : undefined}
          className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition ${
            pathname === "/profile"
              ? "bg-aurora-accent-muted text-aurora-accent"
              : "text-aurora-fg hover:bg-aurora-accent-muted/50"
          } ${tight ? "justify-center" : ""}`}
        >
          <User className="h-4 w-4 shrink-0" />
          {!tight ? "Perfil" : null}
        </Link>
      </nav>

      <RecentProjects collapsed={tight} />

      <div className={`mt-auto border-t border-aurora-border pt-3 ${tight ? "text-center" : ""}`}>
        {!tight ? <p className="mb-2 truncate text-xs text-aurora-muted">{userEmail}</p> : null}
        <form action={signOut}>
          <button
            type="submit"
            className={`w-full rounded-lg px-2 py-1.5 text-sm text-aurora-muted hover:bg-aurora-accent-muted hover:text-aurora-fg ${
              tight ? "text-xs" : ""
            }`}
          >
            {tight ? "Sair" : "Sair"}
          </button>
        </form>
      </div>
    </>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3 z-30 rounded-lg border border-aurora-border bg-aurora-surface p-2 md:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setMobileOpen(false)} />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col overflow-y-auto border-r border-aurora-border bg-aurora-surface p-3 transition-all md:sticky md:top-0 md:z-0 ${
          collapsed ? "md:w-16" : "md:w-64"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
