import type { ProjectBoardRow } from "@/components/projects/types";

export type ProjectsFilterParams = {
  dept?: string;
  q?: string;
  archived?: string;
  sort?: string;
};

export function filterProjectBoards(
  boards: ProjectBoardRow[],
  params: ProjectsFilterParams,
): ProjectBoardRow[] {
  let result = [...boards];

  const showArchived = params.archived === "1";
  if (!showArchived) {
    result = result.filter((b) => !b.archived);
  }

  const dept = params.dept ?? "all";
  if (dept !== "all") {
    if (dept === "general") {
      result = result.filter((b) => !b.department_id);
    } else {
      result = result.filter((b) => b.department_id === dept);
    }
  }

  const q = params.q?.trim().toLowerCase();
  if (q) {
    result = result.filter((b) => b.name.toLowerCase().includes(q));
  }

  const sort = params.sort ?? "name";
  if (sort === "recent") {
    result.sort((a, b) => b.created_at.localeCompare(a.created_at));
  } else {
    result.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }

  return result;
}

export type DeptFilterOption = { id: string; label: string };

/** Sempre inclui Todos + Geral; departamentos vêm do cadastro da org. */
export function buildDeptFilterOptions(
  departments: Array<{ id: string; name: string }>,
): DeptFilterOption[] {
  return [
    { id: "all", label: "Todos os departamentos" },
    { id: "general", label: "Geral (sem departamento)" },
    ...departments.map((d) => ({ id: d.id, label: d.name })),
  ];
}

export function countActiveProjectFilters(params: ProjectsFilterParams): number {
  let n = 0;
  if (params.dept && params.dept !== "all") n++;
  if (params.q?.trim()) n++;
  if (params.archived === "1") n++;
  if (params.sort === "recent") n++;
  return n;
}
