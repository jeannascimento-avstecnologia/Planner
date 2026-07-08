import { describe, expect, it } from "vitest";
import {
  buildPlanDayRange,
  buildPlanVisibleDayRange,
  defaultPlanWindowStart,
  formatDateIso,
  isTodayIso,
  isWeekendIso,
  parsePlanWindowStart,
} from "./window";

describe("plan window", () => {
  it("janela pessoal = 11 dias (5 passados + hoje + 5 futuros)", () => {
    const ref = new Date("2026-07-07T12:00:00");
    const start = defaultPlanWindowStart(ref, true);
    expect(formatDateIso(start)).toBe("2026-07-02");
    const days = buildPlanDayRange(start);
    expect(days).toHaveLength(11);
    expect(formatDateIso(days[5]!)).toBe("2026-07-07");
    expect(formatDateIso(days[10]!)).toBe("2026-07-12");
  });

  it("destaca hoje na janela padrao", () => {
    const start = parsePlanWindowStart(undefined, true);
    const days = buildPlanDayRange(start);
    const todayInRange = days.some((d) => isTodayIso(formatDateIso(d)));
    expect(todayInRange).toBe(true);
  });

  it("modo uteis: 11 colunas sem fins de semana", () => {
    const ref = new Date("2026-07-08T12:00:00");
    const start = defaultPlanWindowStart(ref, false);
    const days = buildPlanVisibleDayRange(start, false);
    expect(days).toHaveLength(11);
    expect(days.every((d) => !isWeekendIso(formatDateIso(d)))).toBe(true);
    expect(formatDateIso(days[5]!)).toBe("2026-07-08");
  });
});
