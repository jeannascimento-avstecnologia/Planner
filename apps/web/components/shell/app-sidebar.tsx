"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, FolderKanban, Home, X } from "lucide-react";
import { signOut } from "@/app/(auth)/auth-actions";
import { RecentProjects } from "./recent-projects";
import { AvsLogo } from "./avs-logo";

type Props = {
  userEmail: string;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
};

const COLLAPSE_KEY = "ngp:sidebar-collapsed";

export function AppSidebar({ userEmail, mobileOpen, setMobileOpen }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(true);

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

  const tight = collapsed && !mobileOpen;

  const nav = [
    { href: "/boards", label: "Home", icon: Home },
    { href: "/calendar", label: "Calendario", icon: Calendar },
    { href: "/boards", label: "Projetos", icon: FolderKanban, matchPrefix: "/boards" },
  ];

  function handleLogoClick(e: React.MouseEvent) {
    if (tight) {
      e.preventDefault();
      toggleCollapsed();
    } else {
      router.push("/boards");
    }
  }

  const sidebarContent = (
    <>
      <div className={`flex min-w-0 items-center gap-1 ${tight ? "flex-col" : "justify-between"}`}>
        <button
          type="button"
          onClick={handleLogoClick}
          className={`flex min-w-0 items-center justify-center ${tight ? "w-full" : "flex-1"}`}
          title={tight ? "Expandir menu" : "Ir para Home"}
        >
          <AvsLogo variant={tight ? "sidebar-collapsed" : "sidebar"} />
        </button>
        <div className={`flex shrink-0 items-center gap-1 ${tight ? "flex-col" : ""}`}>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="hidden rounded p-1 text-aurora-sidebar-muted hover:bg-white/10 md:block"
            aria-label={collapsed ? "Expandir" : "Recolher"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded p-1 text-aurora-sidebar-fg md:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <nav className="mt-4 space-y-1">
        {nav.map(({ href, label, icon: Icon, matchPrefix }) => {
          const isActive =
            pathname === href ||
            (matchPrefix === "/boards" && label === "Projetos" && pathname.startsWith("/boards/")) ||
            (label === "Home" && pathname === "/boards" && !pathname.startsWith("/boards/"));
          const activeHome = label === "Home" && pathname === "/boards";
          const activeProjetos = label === "Projetos" && pathname.startsWith("/boards/");
          const active = label === "Home" ? activeHome : label === "Projetos" ? activeProjetos : isActive;
          return (
            <Link
              key={label}
              href={href}
              onClick={() => setMobileOpen(false)}
              title={tight ? label : undefined}
              className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition ${
                active
                  ? "border-l-2 border-aurora-sidebar-accent bg-white/10 text-aurora-sidebar-fg"
                  : "text-aurora-sidebar-muted hover:bg-white/5 hover:text-aurora-sidebar-fg"
              } ${tight ? "justify-center border-l-0" : ""}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!tight ? label : null}
            </Link>
          );
        })}
      </nav>

      <RecentProjects collapsed={tight} />

      <div className={`mt-auto border-t border-aurora-sidebar-border pt-3 ${tight ? "text-center" : ""}`}>
        {!tight ? <p className="mb-2 truncate text-xs text-aurora-sidebar-muted">{userEmail}</p> : null}
        <form action={signOut}>
          <button
            type="submit"
            className={`w-full rounded-lg bg-aurora-brand-red px-2 py-1.5 text-sm font-semibold text-white hover:brightness-110 ${
              tight ? "text-xs" : ""
            }`}
          >
            Sair
          </button>
        </form>
      </div>
    </>
  );

  return (
    <>
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-40 bg-aurora-overlay md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={`aurora-sidebar-pattern fixed inset-y-0 left-0 z-50 flex h-screen flex-col overflow-y-auto border-r border-aurora-sidebar-border p-3 text-aurora-sidebar-fg transition-all md:sticky md:top-0 md:z-0 ${
          collapsed ? "md:w-16" : "md:w-64"
        } ${mobileOpen ? "w-64 translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
