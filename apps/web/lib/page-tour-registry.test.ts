import { describe, expect, it } from "vitest";
import { resolvePageTourId } from "./page-tour-registry";

describe("resolvePageTourId", () => {
  it("resolve /boards como home", () => {
    expect(resolvePageTourId("/boards")).toBe("home");
  });

  it("nao confunde /boards/uuid com home", () => {
    expect(resolvePageTourId("/boards/550e8400-e29b-41d4-a716-446655440000")).toBe("board-kanban");
  });

  it("resolve rotas principais", () => {
    expect(resolvePageTourId("/projects")).toBe("projects");
    expect(resolvePageTourId("/calendar")).toBe("calendar");
    expect(resolvePageTourId("/plan")).toBe("plan");
    expect(resolvePageTourId("/workload")).toBe("workload");
    expect(resolvePageTourId("/settings")).toBe("settings");
    expect(resolvePageTourId("/help")).toBe("help");
  });

  it("retorna null para subrotas sem tour", () => {
    expect(resolvePageTourId("/settings/organization")).toBeNull();
    expect(resolvePageTourId("/boards/550e8400-e29b-41d4-a716-446655440000/dashboard")).toBeNull();
  });
});
