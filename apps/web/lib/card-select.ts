/** Shared card column lists for board loaders. */

export const CARD_SELECT_CORE =
  "id, column_id, position, parent_id, title, description, priority, due_date, start_date, target_date, estimated_hours, story_points, assignee_id, completed_at, stage_id, tiflux_ticket_number, tiflux_ticket_id, tiflux_canceled_tickets";

export const CARD_SELECT_WITH_TREE = `${CARD_SELECT_CORE}, tree_x, tree_y`;

export function isMissingTreeCoordColumnError(error: {
  message?: string;
  code?: string;
} | null): boolean {
  if (!error) return false;
  if (error.code === "42703") return true;
  const msg = error.message ?? "";
  return msg.includes("tree_x") || msg.includes("tree_y");
}
