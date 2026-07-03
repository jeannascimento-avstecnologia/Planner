import { cache } from "react";
import { loadDeadlines, loadOrgProjects, type LoadOrgProjectsResult } from "@/lib/load-org-projects";
import type { DeadlineTileItem } from "@/components/home/deadline-tiles";

/** Dedupe por request (React cache). Cross-request: revalidateTag em mutations. */
export const loadOrgProjectsCached = cache(async (_userId: string): Promise<LoadOrgProjectsResult> => {
  return loadOrgProjects();
});

export const loadDeadlinesCached = cache(async (_userId: string): Promise<DeadlineTileItem[]> => {
  return loadDeadlines();
});
