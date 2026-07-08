const WORKLOAD_VIEW_PATCH_KEYS = new Set([
  "estimated_hours",
  "target_date",
  "assignee_id",
  "start_date",
  "due_date",
]);

export function patchAffectsWorkloadViews(patch: Record<string, unknown>): boolean {
  return Object.keys(patch).some((key) => WORKLOAD_VIEW_PATCH_KEYS.has(key));
}
