import { redirect } from "next/navigation";
import { SettingsHubCards, type SettingsHubCard } from "@/components/settings/settings-hub-cards";
import { loadOrgSettingsContext } from "@/lib/load-org-settings";
import { isOrgAdminRole, orgRoleLabel } from "@/lib/org-member-roles";
import { Building2, FileSearch, Plug, Shield, Settings2, UserPlus, Users } from "lucide-react";

export default async function SettingsHubPage() {
  const ctx = await loadOrgSettingsContext();
  if (!ctx) redirect("/login");

  const isAdmin = isOrgAdminRole(ctx.userRole);

  const organizationCards: SettingsHubCard[] = [
    {
      href: "/settings/organization",
      title: "Membros",
      description: "Visualize e gerencie quem faz parte da organizacao.",
      icon: Users,
      testId: "settings-card-organization",
      tone: "sky",
    },
    {
      href: "/settings/organization/invites",
      title: "Convites",
      description: "Envie e acompanhe convites pendentes.",
      icon: UserPlus,
      testId: "settings-card-invites",
      tone: "emerald",
    },
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
      adminCards={adminCards}
    />
  );
}
