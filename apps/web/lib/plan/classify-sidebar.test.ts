import { describe, expect, it } from "vitest";
import { classifyPlanSidebarBucket } from "./classify-sidebar";

const today = "2026-07-07";

describe("classifyPlanSidebarBucket", () => {
  it("com alocacao diaria nao vai para sidebar", () => {
    expect(
      classifyPlanSidebarBucket(
        { estimated_hours: 8, target_date: "2026-07-13T12:00:00.000Z", start_date: null, due_date: null },
        true,
        today,
      ),
    ).toBeNull();
  });

  it("target_date sem alocacao vai para Nao agendados", () => {
    expect(
      classifyPlanSidebarBucket(
        {
          estimated_hours: null,
          target_date: "2026-07-13T12:00:00.000Z",
          start_date: "2026-07-07T12:00:00.000Z",
          due_date: "2026-07-10T12:00:00.000Z",
        },
        false,
        today,
      ),
    ).toBe("unscheduled");
  });

  it("sem horas e sem datas vai para Sem estimativa", () => {
    expect(
      classifyPlanSidebarBucket(
        { estimated_hours: null, target_date: null, start_date: null, due_date: null },
        false,
        today,
      ),
    ).toBe("no_estimate");
  });

  it("horas estimadas sem alocacao vai para Nao agendados", () => {
    expect(
      classifyPlanSidebarBucket(
        { estimated_hours: 8, target_date: null, start_date: null, due_date: null },
        false,
        today,
      ),
    ).toBe("unscheduled");
  });
});
