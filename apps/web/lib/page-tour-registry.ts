import type { PageTourId } from "@/lib/page-tour-steps";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function resolvePageTourId(pathname: string): PageTourId | null {
  const path = pathname.split("?")[0]?.replace(/\/$/, "") || "/";

  if (path === "/boards") return "home";
  if (path === "/projects") return "projects";
  if (path === "/calendar") return "calendar";
  if (path === "/plan") return "plan";
  if (path === "/workload") return "workload";
  if (path === "/settings") return "settings";
  if (path === "/help") return "help";

  const boardMatch = path.match(/^\/boards\/([^/]+)$/);
  if (boardMatch && UUID_PATTERN.test(boardMatch[1] ?? "")) {
    return "board-kanban";
  }

  return null;
}

export const ALL_PAGE_TOUR_IDS: PageTourId[] = [
  "home",
  "projects",
  "calendar",
  "plan",
  "workload",
  "settings",
  "help",
  "board-kanban",
];
