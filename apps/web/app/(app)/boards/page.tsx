import { createOrganization } from "./actions";
import { inputClass, btnPrimary } from "@/lib/ui-classes";
import { DeadlineTiles } from "@/components/home/deadline-tiles";
import { OrgLogo } from "@/components/organizations/OrgLogo";
import { HomeProjectsGrouped } from "@/components/home/home-projects-grouped";
import { CreateProjectForm } from "@/components/projects/create-project-form";
import { loadOrgProjects } from "@/lib/load-org-projects";

export default async function BoardsPage() {
  const result = await loadOrgProjects();

  if (result.kind === "no-org") {
    return (
      <div className="mx-auto max-w-sm rounded-2xl border border-aurora-border bg-aurora-surface p-6">
        <h2 className="mb-1 text-lg font-semibold">Crie sua organizacao</h2>
        <p className="mb-4 text-sm text-aurora-muted">Voce ainda nao pertence a nenhuma organizacao.</p>
        <form action={createOrganization} className="flex gap-2">
          <input name="orgName" placeholder="Nome da organizacao" required className={inputClass} />
          <button className={btnPrimary + " shrink-0"}>Criar</button>
        </form>
      </div>
    );
  }

  const { activeOrgName, activeOrgLogoUrl, activeOrgId, sections, currentUserId, boardMembersByBoardId, deadlineItems } =
    result.data;

  const creatableOrgs = sections
    .filter((s) => s.isOrgAdmin)
    .map((s) => ({ orgId: s.orgId, name: s.orgName, isActive: s.isActive, logoUrl: s.logoUrl }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-lg font-semibold text-aurora-fg">Home</h2>
          <div className="mt-1 flex items-center gap-2 text-sm text-aurora-muted">
            {activeOrgName ? (
              <>
                <OrgLogo name={activeOrgName} logoUrl={activeOrgLogoUrl} size="xs" />
                <span>Org ativa: {activeOrgName}</span>
              </>
            ) : (
              <span>Seus projetos por organizacao</span>
            )}
          </div>
        </div>
      </div>

      <DeadlineTiles items={deadlineItems} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        {creatableOrgs.length > 0 ? (
          <CreateProjectForm orgOptions={creatableOrgs} defaultOrgId={activeOrgId} />
        ) : (
          <p className="text-sm text-aurora-muted">
            Voce nao tem permissao para criar projetos em nenhuma organizacao.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <HomeProjectsGrouped
          sections={sections}
          boardMembersByBoardId={boardMembersByBoardId}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  );
}
