import { createOrganization } from "@/app/(app)/boards/actions";
import { inputClass, btnPrimary } from "@/lib/ui-classes";
import { OrgLogo } from "@/components/organizations/OrgLogo";
import { ProjectsViews } from "@/components/projects/projects-views";
import { ProjectsHubLayout } from "@/components/projects/projects-hub-shell";
import { CreateProjectForm } from "@/components/projects/create-project-form";
import { loadOrgProjects } from "@/lib/load-org-projects";

export default async function ProjectsPage() {
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

  const { orgName, isOrgAdmin, currentUserId, sections, activeOrgId, activeOrgLogoUrl, boardMembersByBoardId, upcomingTasksByBoard } =
    result.data;
  const boards = sections.find((s) => s.orgId === activeOrgId)?.boards ?? [];
  const creatableOrgs = sections
    .filter((s) => s.isOrgAdmin)
    .map((s) => ({ orgId: s.orgId, name: s.orgName, isActive: s.isActive, logoUrl: s.logoUrl }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-aurora-fg">Projetos</h2>
        <div className="mt-1 flex items-center gap-2 text-sm text-aurora-muted">
          {orgName ? (
            <>
              <OrgLogo name={orgName} logoUrl={activeOrgLogoUrl} size="xs" />
              <span>{orgName}</span>
            </>
          ) : null}
        </div>
      </div>

      <ProjectsHubLayout
        boards={boards}
        boardMembersByBoardId={boardMembersByBoardId}
        isOrgAdmin={isOrgAdmin}
        currentUserId={currentUserId}
        upcomingTasksByBoard={upcomingTasksByBoard}
        basePath="/projects"
      >
        {creatableOrgs.length > 0 ? (
          <CreateProjectForm orgOptions={creatableOrgs} defaultOrgId={activeOrgId} />
        ) : null}
        <ProjectsViews
          boards={boards}
          boardMembersByBoardId={boardMembersByBoardId}
          isOrgAdmin={isOrgAdmin}
          currentUserId={currentUserId}
          hubMode
          hubBasePath="/projects"
        />
      </ProjectsHubLayout>
    </div>
  );
}
