import { redirect } from "next/navigation";
import { SettingsHubCards, type SettingsHubCard } from "@/components/settings/settings-hub-cards";
import { loadOrgSettingsContext } from "@/lib/load-org-settings";
import { isOrgAdminRole, orgRoleLabel } from "@/lib/org-member-roles";
import { Building2, Bot, FileSearch, Plug, Settings2, Shield, Users, Wrench } from "lucide-react";

export default async function SettingsHubPage() {
  const ctx = await loadOrgSettingsContext();
  if (!ctx) redirect("/login");

  const isAdmin = isOrgAdminRole(ctx.userRole);

  const organizationCards: SettingsHubCard[] = [
    {
      href: "/settings/organization/settings",
      title: "Dados da organizacao",
      description: "Nome, slug, logo e configuracoes gerais.",
      icon: Settings2,
      testId: "settings-card-org-settings",
      tone: "amber",
    },
    {
      href: "/settings/organizations",
      title: "Minhas organizacoes",
      description: "Troque de org, crie novas ou gerencie departamentos.",
      icon: Building2,
      testId: "settings-card-organizations",
      tone: "indigo",
    },
  ];

  const platformCards: SettingsHubCard[] = isAdmin
    ? [
        {
          href: "/settings/users",
          title: "Usuarios",
          description: "Membros, convites pendentes e acesso aos workspaces.",
          icon: Users,
          testId: "settings-card-users",
          tone: "sky",
        },
        {
          href: "/settings/external-tools",
          title: "Ferramentas Externas",
          description: "Providers e integracoes de IA externas.",
          icon: Wrench,
          testId: "settings-card-external-tools",
          tone: "orange",
        },
        {
          href: "/settings/agents",
          title: "Agentes",
          description: "Configure agentes de IA e prompts.",
          icon: Bot,
          testId: "settings-card-agents",
          tone: "violet",
        },
      ]
    : [];

  const adminCards: SettingsHubCard[] = isAdmin
    ? [
        {
          href: "/settings/integrations",
          title: "Integracoes",
          description: "Slack, Google Calendar, Microsoft Teams e exportacoes.",
          icon: Plug,
          testId: "settings-card-integrations",
          tone: "violet",
        },
        {
          href: "/settings/audit",
          title: "Auditoria",
          description: "Historico de acoes com exportacao CSV e PDF.",
          icon: FileSearch,
          testId: "settings-card-audit",
          tone: "rose",
        },
        {
          href: "/settings/permissions",
          title: "Permissoes de campos",
          description: "Regras de acesso por papel e recurso.",
          icon: Shield,
          testId: "settings-card-permissions",
          tone: "teal",
        },
      ]
    : [];

  return (
    <SettingsHubCards
      orgName={ctx.orgName}
      userRoleLabel={orgRoleLabel(ctx.userRole)}
      organizationCards={organizationCards}
      platformCards={platformCards}
      adminCards={adminCards}
    />
  );
}
