"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Calendar, CalendarClock, ChevronLeft, ChevronRight, CircleHelp, FolderKanban, Home, Settings, X, BarChart3 } from "lucide-react";
import { RecentProjects } from "./recent-projects";
import { AgifyLogo } from "./agify-logo";
import { SignOutButton } from "./sign-out-button";
import { NavLink } from "./nav-link";
import { isSamePath } from "@/lib/client-url-state";
import { isNavigationInFlight, setNavigationInFlight } from "@/lib/navigation-in-flight";

import type { BoardMeta } from "@/lib/recent-boards";
import { useOnboardingTour } from "@/components/onboarding/onboarding-tour-provider";

type Props = {
  userEmail: string;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  accessibleBoardIds: string[];
  boardMetaById: Record<string, BoardMeta>;
  showWorkload: boolean;
};

const COLLAPSE_KEY = "ngp:sidebar-collapsed";

export function AppSidebar({
  userEmail,
  mobileOpen,
  setMobileOpen,
  accessibleBoardIds,
  boardMetaById,
  showWorkload,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { registerSidebarPrep } = useOnboardingTour();
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem(COLLAPSE_KEY) === "false") setCollapsed(false);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    registerSidebarPrep(() => {
      setCollapsed(false);
      try {
        localStorage.setItem(COLLAPSE_KEY, "false");
      } catch {
        // ignore
      }
    });
  }, [registerSidebarPrep]);

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
    { href: "/boards", label: "Home", icon: Home, tourId: "nav-boards" },
    { href: "/calendar", label: "Calendario", icon: Calendar, tourId: "nav-calendar" },
    { href: "/plan", label: "Meu plano", icon: CalendarClock, tourId: "nav-plan" },
    { href: "/projects", label: "Projetos", icon: FolderKanban, tourId: "nav-projects" },
    ...(showWorkload
      ? [{ href: "/workload", label: "Carga", icon: BarChart3, tourId: "nav-workload" }]
      : []),
  ];

  const activeSettings = pathname === "/settings" || pathname.startsWith("/settings/");
  const activeHelp = isSamePath("/help", pathname);

  function handleLogoClick(e: React.MouseEvent) {
    if (tight) {
      e.preventDefault();
      toggleCollapsed();
      return;
    }
    e.preventDefault();
    if (isSamePath("/boards", pathname)) return;
    if (isNavigationInFlight("/boards")) return;
    setNavigationInFlight("/boards");
    router.push("/boards", { scroll: false });
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
          <AgifyLogo variant={tight ? "sidebar-collapsed" : "sidebar"} />
        </button>
        <div className={`flex shrink-0 items-center gap-1 ${tight ? "flex-col" : ""}`}>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="hidden rounded p-1 text-white hover:bg-white/10 md:block"
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
        {nav.map(({ href, label, icon: Icon, tourId }) => {
          const activeHome = label === "Home" && pathname === "/boards";
          const activeProjetos =
            label === "Projetos" && (pathname === "/projects" || pathname.startsWith("/boards/"));
          const active =
            label === "Home" ? activeHome : label === "Projetos" ? activeProjetos : isSamePath(href, pathname);
          return (
            <NavLink
              key={label}
              href={href}
              data-tour={tourId}
              onClick={() => setMobileOpen(false)}
              title={tight ? label : undefined}
              className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition ${
                active
                  ? "border-l-2 border-white/40 bg-white/15 text-white"
                  : "text-white/85 hover:bg-white/10 hover:text-white"
              } ${tight ? "justify-center border-l-0" : ""}`}
            >
              <Icon className="h-4 w-4 shrink-0 text-white" />
              {!tight ? label : null}
            </NavLink>
          );
        })}
      </nav>

      <RecentProjects
        collapsed={tight}
        accessibleBoardIds={accessibleBoardIds}
        boardMetaById={boardMetaById}
      />

      <div className={`mt-auto space-y-1 border-t border-aurora-sidebar-border pt-3 ${tight ? "text-center" : ""}`}>
        {!tight ? <p className="mb-2 truncate text-xs text-white/70">{userEmail}</p> : null}
        <NavLink
          href="/help"
          data-tour="nav-help"
          onClick={() => setMobileOpen(false)}
          title={tight ? "Ajuda" : undefined}
          data-testid="sidebar-help-link"
          className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition ${
            activeHelp
              ? "border-l-2 border-white/40 bg-white/15 text-white"
              : "text-white/85 hover:bg-white/10 hover:text-white"
          } ${tight ? "justify-center border-l-0" : ""}`}
        >
          <CircleHelp className="h-4 w-4 shrink-0 text-white" />
          {!tight ? "Ajuda" : null}
        </NavLink>
        <NavLink
          href="/settings"
          data-tour="nav-settings"
          onClick={() => setMobileOpen(false)}
          title={tight ? "Configuracoes" : undefined}
          data-testid="sidebar-settings-link"
          className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition ${
            activeSettings
              ? "border-l-2 border-white/40 bg-white/15 text-white"
              : "text-white/85 hover:bg-white/10 hover:text-white"
          } ${tight ? "justify-center border-l-0" : ""}`}
        >
          <Settings className="h-4 w-4 shrink-0 text-white" />
          {!tight ? "Configuracoes" : null}
        </NavLink>
        <SignOutButton
          iconOnly={tight}
          confirmBeforeSignOut
          className={`flex items-center justify-center rounded-lg border border-aurora-danger/50 bg-aurora-danger/15 text-aurora-danger hover:bg-aurora-danger/25 ${
            tight ? "h-9 w-full p-0" : "w-full px-2 py-1.5 text-sm font-semibold"
          }`}
        />
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
        data-mobile-open={mobileOpen ? "true" : "false"}
        className={`aurora-sidebar-gradient aurora-sidebar-gradient--flow fixed inset-y-0 left-0 z-50 flex h-[100dvh] shrink-0 flex-col overflow-y-auto border-r border-aurora-sidebar-border p-3 text-aurora-sidebar-fg transition-all md:sticky md:top-0 md:z-0 md:self-start ${
          collapsed ? "md:w-16" : "md:w-64"
        } ${mobileOpen ? "w-64 translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
