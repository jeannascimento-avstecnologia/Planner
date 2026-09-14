import { afterEach, describe, expect, it } from "vitest";
import {
  DEBUG_REPORT_MAX_SESSION_EVENTS,
  clearSessionLog,
  getSessionLogSnapshot,
  recordApiError,
  recordNavigation,
  resetSessionLogCollectorForTests,
} from "./index";

describe("session-log-collector", () => {
  afterEach(() => {
    resetSessionLogCollectorForTests();
  });

  it("redige Bearer e api_key em mensagem e meta", () => {
    recordApiError("Authorization: Bearer abc.def.ghi failed", {
      header: "Bearer super-secret-token",
      note: "api_key=sk-live-123",
    });
    const [event] = getSessionLogSnapshot();
    expect(event?.message).toContain("[REDACTED]");
    expect(event?.message).not.toContain("abc.def.ghi");
    expect(String(event?.meta?.header)).toContain("[REDACTED]");
    expect(String(event?.meta?.note)).toContain("[REDACTED]");
    expect(String(event?.meta?.note)).not.toContain("sk-live-123");
  });

  it("FIFO remove o mais antigo alem do maximo", () => {
    for (let i = 0; i < DEBUG_REPORT_MAX_SESSION_EVENTS + 5; i += 1) {
      recordNavigation(`/p/${i}`);
    }
    const snap = getSessionLogSnapshot();
    expect(snap).toHaveLength(DEBUG_REPORT_MAX_SESSION_EVENTS);
    expect(snap[0]?.meta?.path).toBe("/p/5");
    expect(snap.at(-1)?.meta?.path).toBe(`/p/${DEBUG_REPORT_MAX_SESSION_EVENTS + 4}`);
  });

  it("clearSessionLog esvazia o buffer", () => {
    recordNavigation("/boards");
    clearSessionLog();
    expect(getSessionLogSnapshot()).toEqual([]);
  });
});
