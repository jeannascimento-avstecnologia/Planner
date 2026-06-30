import { createOrganization } from "@/app/(app)/boards/actions";
import { inputClass, btnPrimary } from "@/lib/ui-classes";
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

  const { orgName, isOrgAdmin, currentUserId, boards, boardMembersByBoardId, upcomingTasksByBoard } = result.data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-aurora-fg">Projetos</h2>
        <p className="text-sm text-aurora-muted">{orgName}</p>
      </div>

      <ProjectsHubLayout
        boards={boards}
        boardMembersByBoardId={boardMembersByBoardId}
        isOrgAdmin={isOrgAdmin}
        currentUserId={currentUserId}
        upcomingTasksByBoard={upcomingTasksByBoard}
        basePath="/projects"
      >
        <CreateProjectForm />
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
