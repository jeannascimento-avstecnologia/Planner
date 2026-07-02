"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs: Array<{ href: string; label: string; exact?: boolean }> = [
  { href: "/settings/organization", label: "Membros", exact: true },
  { href: "/settings/organization/invites", label: "Convites" },
  { href: "/settings/organization/settings", label: "Configuracoes" },
];

export function OrgSettingsTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 border-b border-aurora-border pb-3" aria-label="Configuracoes da organizacao">
      {tabs.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-aurora-accent/15 text-aurora-accent"
                : "text-aurora-muted hover:bg-aurora-surface-2 hover:text-aurora-fg"
            }`}
            data-testid={`org-settings-tab-${tab.label.toLowerCase()}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
