import { describe, expect, it } from "vitest";
import { DebugReportFormSchema, SubmitDebugReportInputSchema } from "./schemas";

describe("debug-report schemas", () => {
  it("form exige titulo e descricao", () => {
    expect(DebugReportFormSchema.safeParse({ title: "", description: "x" }).success).toBe(false);
    expect(DebugReportFormSchema.safeParse({ title: "Bug", description: "Falhou" }).success).toBe(true);
  });

  it("submit rejeita screenshot vazio", () => {
    const parsed = SubmitDebugReportInputSchema.safeParse({
      title: "Bug",
      description: "Falhou",
      screenshotBase64: "",
      sessionLog: [],
      clientMeta: {
        url: "http://localhost:3001/boards",
        userAgent: "test",
        viewport: { width: 1280, height: 800 },
        app: "planner-web",
      },
    });
    expect(parsed.success).toBe(false);
  });
});
