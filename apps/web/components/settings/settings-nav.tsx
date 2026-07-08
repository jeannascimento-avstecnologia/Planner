"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ChevronRight,
  FileSearch,
  Home,
  KeyRound,
  Plug,
  Settings2,
  Shield,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import { focusRingAurora, navChipClass } from "@/lib/ui-classes";
import { orgRoleLabel } from "@/lib/org-member-roles";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
  adminOnly?: boolean;
  testId: string;
};

const NAV_SECTIONS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "Visao geral",
    items: [{ href: "/settings", label: "Inicio", icon: Home, exact: true, testId: "settings-nav-inicio" }],
  },
  {
    title: "Organizacao",
    items: [
      { href: "/settings/organization", label: "Membros", icon: Users, exact: true, testId: "org-settings-tab-membros" },
      { href: "/settings/organization/invites", label: "Convites", icon: UserPlus, testId: "org-settings-tab-convites" },
      { href: "/settings/organization/settings", label: "Geral", icon: Settings2, testId: "org-settings-tab-geral" },
    ],
  },
  {
    title: "Administracao",
    items: [
      { href: "/settings/integrations", label: "Integracoes", icon: Plug, adminOnly: true, testId: "org-settings-tab-integracoes" },
      { href: "/settings/audit", label: "Auditoria", icon: FileSearch, adminOnly: true, testId: "org-settings-tab-auditoria" },
      { href: "/settings/permissions", label: "Permissoes", icon: Shield, adminOnly: true, testId: "org-settings-tab-permissoes" },
    ],
  },
  {
    title: "Conta",
    items: [
      { href: "/settings/organizations", label: "Minhas organizacoes", icon: Building2, testId: "settings-nav-organizations" },
      { href: "/profile", label: "Meu perfil", icon: User, testId: "settings-nav-profile" },
      { href: "/profile/password", label: "Mudar senha", icon: KeyRound, testId: "settings-nav-password" },
    ],
  },
];

type Props = {
  showAdminTabs: boolean;
  userFullName: string | null;
  userEmail: string;
  userRole: string;
  mobile?: boolean;
};

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  if (item.href === "/settings") return pathname === "/settings";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLinkItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      data-testid={item.testId}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-aurora-brand-muted/50 text-aurora-brand shadow-sm ring-1 ring-aurora-brand/20"
          : "text-aurora-muted hover:bg-aurora-surface-2 hover:text-aurora-fg"
      } ${focusRingAurora}`}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="truncate">{item.label}</span>
      {active ? <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-60" aria-hidden /> : null}
    </Link>
  );
}

export function SettingsNav({ showAdminTabs, userFullName, userEmail, userRole, mobile = false }: Props) {
  const pathname = usePathname();
  const displayName = userFullName?.trim() || userEmail.split("@")[0] || "Usuario";

  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.adminOnly || showAdminTabs),
  })).filter((section) => section.items.length > 0);

  if (mobile) {
    const flat = sections.flatMap((s) => s.items);
    const current = flat.find((item) => isActive(pathname, item)) ?? flat[0];
    return (
      <label className="block lg:hidden">
        <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-aurora-muted">Secao</span>
        <select
          className={`${navChipClass} w-full appearance-none pr-8`}
          value={current?.href ?? "/settings"}
          onChange={(e) => {
            window.location.href = e.target.value;
          }}
          data-testid="settings-nav-mobile-select"
        >
          {sections.map((section) => (
            <optgroup key={section.title} label={section.title}>
              {section.items.map((item) => (
                <option key={item.href} value={item.href}>
                  {item.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
    );
  }

  return (
    <nav className="hidden space-y-5 lg:block" aria-label="Configuracoes" data-testid="settings-nav">
      <div className="rounded-xl border border-aurora-border bg-aurora-surface-2/60 px-3 py-3">
        <p className="truncate text-sm font-semibold text-aurora-fg" data-testid="settings-user-display-name">
          {displayName}
        </p>
        <p className="truncate text-xs text-aurora-muted">{userEmail}</p>
        <span className="mt-2 inline-flex rounded-full border border-aurora-brand/25 bg-aurora-brand-muted/40 px-2 py-0.5 text-[11px] font-medium text-aurora-brand">
          {orgRoleLabel(userRole)}
        </span>
      </div>

      {sections.map((section) => (
        <div key={section.title}>
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-aurora-muted">{section.title}</p>
          <div className="space-y-0.5">
            {section.items.map((item) => (
              <NavLinkItem key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
