"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs: Array<{
  href: string;
  label: string;
  exact?: boolean;
  adminOnly?: boolean;
  ownerOnly?: boolean;
}> = [
  { href: "/settings/organization", label: "Membros", exact: true },
  { href: "/settings/organization/invites", label: "Convites" },
  { href: "/settings/organization/settings", label: "Geral" },
  { href: "/settings/audit", label: "Auditoria", adminOnly: true },
  { href: "/settings/integrations", label: "Integracoes", adminOnly: true },
  { href: "/settings/permissions", label: "Permissoes", adminOnly: true },
  { href: "/settings/access-presets", label: "Presets de acesso", ownerOnly: true },
];

type Props = { showAdminTabs?: boolean; showOwnerTabs?: boolean };

export function OrgSettingsTabs({ showAdminTabs = false, showOwnerTabs = false }: Props) {
  const pathname = usePathname();
  const visible = tabs.filter((t) => {
    if (t.ownerOnly && !showOwnerTabs) return false;
    if (t.adminOnly && !showAdminTabs) return false;
    return true;
  });

  return (
    <nav className="flex flex-wrap gap-2 border-b border-aurora-border pb-3" aria-label="Configuracoes da organizacao">
      {visible.map((tab) => {
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
