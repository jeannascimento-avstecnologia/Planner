"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { focusRingAurora, navChipClass } from "@/lib/ui-classes";
import { orgRoleLabel } from "@/lib/org-member-roles";
import { isSettingsNavActive, SETTINGS_NAV_SECTIONS, type SettingsNavItem } from "@/lib/settings-navigation";

type Props = {
  showAdminTabs: boolean;
  showOwnerTabs?: boolean;
  userFullName: string | null;
  userEmail: string;
  userRole: string;
  mobile?: boolean;
};

function NavLinkItem({ item, pathname }: { item: SettingsNavItem; pathname: string }) {
  const active = isSettingsNavActive(pathname, item);
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

export function SettingsNav({
  showAdminTabs,
  showOwnerTabs = false,
  userFullName,
  userEmail,
  userRole,
  mobile = false,
}: Props) {
  const pathname = usePathname();
  const displayName = userFullName?.trim() || userEmail.split("@")[0] || "Usuario";

  const sections = SETTINGS_NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (item.ownerOnly && !showOwnerTabs) return false;
      if (item.adminOnly && !showAdminTabs) return false;
      return true;
    }),
  })).filter((section) => section.items.length > 0);

  if (mobile) {
    const flat = sections.flatMap((s) => s.items);
    const current = flat.find((item) => isSettingsNavActive(pathname, item)) ?? flat[0];
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
