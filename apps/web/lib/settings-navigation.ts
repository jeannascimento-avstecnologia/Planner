import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Building2,
  FileSearch,
  Home,
  KeyRound,
  Plug,
  Settings2,
  Shield,
  ShieldCheck,
  User,
  UserPlus,
  Users,
  Wrench,
} from "lucide-react";

export type SettingsNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  adminOnly?: boolean;
  ownerOnly?: boolean;
  testId: string;
};

export type SettingsNavSection = {
  title: string;
  items: SettingsNavItem[];
};

export const SETTINGS_NAV_SECTIONS: SettingsNavSection[] = [
  {
    title: "Visao geral",
    items: [{ href: "/settings", label: "Inicio", icon: Home, exact: true, testId: "settings-nav-inicio" }],
  },
  {
    title: "Plataforma",
    items: [
      { href: "/settings/users", label: "Usuarios", icon: Users, exact: true, adminOnly: true, testId: "settings-nav-users" },
      {
        href: "/settings/external-tools",
        label: "Ferramentas Externas",
        icon: Wrench,
        exact: true,
        adminOnly: true,
        testId: "settings-nav-external-tools",
      },
      { href: "/settings/agents", label: "Agentes", icon: Bot, adminOnly: true, testId: "settings-nav-agents" },
    ],
  },
  {
    title: "Organizacao",
    items: [
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
      {
        href: "/settings/access-presets",
        label: "Presets de acesso",
        icon: ShieldCheck,
        ownerOnly: true,
        testId: "org-settings-tab-presets",
      },
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

export function isSettingsNavActive(pathname: string, item: SettingsNavItem): boolean {
  if (item.exact) return pathname === item.href;
  if (item.href === "/settings") return pathname === "/settings";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
