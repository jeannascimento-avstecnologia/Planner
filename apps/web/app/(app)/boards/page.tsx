import { Suspense } from "react";
import { createOrganization } from "./actions";
import { PAGE_COPY } from "@/lib/page-copy";
import { inputClass, btnPrimary } from "@/lib/ui-classes";
import { DeadlineTiles } from "@/components/home/deadline-tiles";
import { HomeProjectsGrouped } from "@/components/home/home-projects-grouped";
import { CreateProjectForm } from "@/components/projects/create-project-form";
import { loadOrgProjectsCached } from "@/lib/loaders/cached-queries";
import { loadOrgProjects } from "@/lib/load-org-projects";
import { getSessionUser } from "@/lib/loaders/session";
import type { OrgProjectSection } from "@/lib/load-org-projects";
import type { BoardMember } from "@/components/board/share-project-panel";
import { Skeleton } from "@/components/ui/skeleton";

export const experimental_ppr = true;

type ProjectsSectionProps = {
  sections: OrgProjectSection[];
  boardMembersByBoardId: Record<string, BoardMember[]>;
  currentUserId: string | null;
};

function ProjectsSection({ sections, boardMembersByBoardId, currentUserId }: ProjectsSectionProps) {
  return (
    <HomeProjectsGrouped
      sections={sections}
      boardMembersByBoardId={boardMembersByBoardId}
      currentUserId={currentUserId}
    />
  );
}

function BoardsPageFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48 rounded-lg" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

async function BoardsPageContent() {
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
    activeOrgId,
    sections,
    currentUserId,
    boardMembersByBoardId,
    creatableDepartments,
    deadlineItems,
  } = result.data;

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-lg font-semibold text-aurora-fg">Home</h2>
          <p className="mt-1 text-sm text-aurora-muted">{PAGE_COPY.home.description}</p>
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
        <ProjectsSection
          sections={sections}
          boardMembersByBoardId={boardMembersByBoardId}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  );
}

export default async function BoardsPage() {
  return (
    <Suspense fallback={<BoardsPageFallback />}>
      <BoardsPageContent />
    </Suspense>
  );
}
