import { Suspense } from "react";
import { createOrganization } from "@/app/(app)/boards/actions";
import { inputClass, btnPrimary } from "@/lib/ui-classes";
import { ProjectsViews } from "@/components/projects/projects-views";
import { ProjectsHubLayout } from "@/components/projects/projects-hub-shell";
import { CreateProjectForm } from "@/components/projects/create-project-form";
import { ProjectsFiltersPanel } from "@/components/projects/projects-filters-panel";
import { PlanningPageHeader } from "@/components/shell/planning-page-header";
import { PageTourTrigger } from "@/components/onboarding/page-tour-trigger";
import { ProjectsPageTourPrep } from "@/components/onboarding/page-tour-preps";
import { FolderKanban } from "lucide-react";
import { loadOrgProjectsCached } from "@/lib/loaders/cached-queries";
import { loadOrgProjects } from "@/lib/load-org-projects";
import { getSessionUser } from "@/lib/loaders/session";
import { PAGE_COPY } from "@/lib/page-copy";
import { buildDeptFilterOptions, filterProjectBoards } from "@/lib/filter-projects-boards";

type Props = {
  searchParams: Promise<{ dept?: string; q?: string; archived?: string; sort?: string }>;
};

export default async function ProjectsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const user = await getSessionUser();
  const result = user ? await loadOrgProjectsCached(user.id) : await loadOrgProjects();

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

  const {
    isOrgAdmin,
    currentUserId,
    sections,
    activeOrgId,
    boardMembersByBoardId,
    upcomingTasksByBoard,
    creatableDepartments,
  } = result.data;

  const activeSection = sections.find((s) => s.orgId === activeOrgId);
  const rawBoards = activeSection?.boards ?? [];
  const boards = filterProjectBoards(rawBoards, sp);
  const deptOptions = buildDeptFilterOptions(activeSection?.departments ?? []);

  const orgOptions = sections.map((s) => ({
    orgId: s.orgId,
    name: s.orgName,
    logoUrl: s.logoUrl,
  }));

  const creatableByOrg = new Map<string, { id: string | null; label: string }[]>();
  for (const item of creatableDepartments) {
    const list = creatableByOrg.get(item.orgId) ?? [];
    list.push({ id: item.departmentId, label: item.departmentId ? item.label.split(" — ").slice(1).join(" — ") : "Geral" });
    creatableByOrg.set(item.orgId, list);
  }

  const creatableOrgs = sections
    .filter((s) => creatableByOrg.has(s.orgId))
    .map((s) => ({
      orgId: s.orgId,
      name: s.orgName,
      isActive: s.isActive,
      logoUrl: s.logoUrl,
      departmentOptions: creatableByOrg.get(s.orgId) ?? [{ id: null, label: "Geral" }],
    }));

  const deptLabel =
    sp.dept && sp.dept !== "all"
      ? deptOptions.find((d) => d.id === sp.dept)?.label
      : null;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6" data-testid="projects-page">
      <Suspense fallback={null}>
        <ProjectsPageTourPrep firstBoardId={boards[0]?.id ?? null} />
      </Suspense>
      <div data-tour="projects-header">
        <PlanningPageHeader
          title={PAGE_COPY.projects.title}
          icon={<FolderKanban className="h-5 w-5" aria-hidden />}
          actions={<PageTourTrigger />}
          description={
          <>
            {PAGE_COPY.projects.description}
            {deptLabel ? (
              <span className="mt-1 block text-xs font-medium text-aurora-brand">
                {activeSection?.orgName} · {deptLabel}
              </span>
            ) : null}
          </>
        }
        />
      </div>

      <Suspense fallback={null}>
        <div data-tour="projects-filters">
          <ProjectsFiltersPanel orgs={orgOptions} activeOrgId={activeOrgId} deptOptions={deptOptions} />
        </div>
      </Suspense>

      {boards.length === 0 ? (
        <p className="rounded-lg border border-aurora-border bg-aurora-surface-2/40 px-4 py-8 text-center text-sm text-aurora-muted">
          Nenhum projeto encontrado com os filtros atuais.
        </p>
      ) : null}

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
