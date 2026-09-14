import { describe, expect, it, vi } from "vitest";
import type { SubmitDebugReportInput } from "./schemas";
import {
  buildDebugReportEmailHtml,
  parseDebugReportRecipients,
  sanitizeSessionLog,
  sendDebugReport,
} from "./send-debug-report";

const baseInput = (): SubmitDebugReportInput => ({
  title: "Barra sumiu",
  description: "Ao abrir a timeline a barra nao aparece.",
  notes: "so no zoom mes",
  screenshotBase64: "data:image/png;base64,aaaa",
  sessionLog: [
    {
      ts: "2026-09-10T12:00:00.000Z",
      type: "api.error",
      message: "Bearer super-token failed",
      meta: { header: "Bearer abc" },
    },
  ],
  clientMeta: {
    url: "http://localhost:3001/boards",
    userAgent: "Mozilla/5.0",
    viewport: { width: 1280, height: 800 },
    app: "planner-web",
    workspace: "org-1",
  },
});

describe("send-debug-report", () => {
  it("parseia recipients por virgula", () => {
    expect(parseDebugReportRecipients(" a@x.com , b@y.com ")).toEqual(["a@x.com", "b@y.com"]);
    expect(parseDebugReportRecipients("")).toEqual([]);
    expect(parseDebugReportRecipients(undefined)).toEqual([]);
  });

  it("sanitize redige token no log", () => {
    const [event] = sanitizeSessionLog(baseInput().sessionLog);
    expect(event?.message).toContain("[REDACTED]");
    expect(event?.message).not.toContain("super-token");
    expect(String(event?.meta?.header)).toContain("[REDACTED]");
  });

  it("html escapa titulo malicioso", () => {
    const html = buildDebugReportEmailHtml({
      title: "<script>alert(1)</script>",
      description: "ok",
      reporterName: "Ana",
      reporterEmail: "ana@x.com",
      orgName: "Acme",
      clientMeta: baseInput().clientMeta,
      sessionLog: [],
      screenshotBase64: "aaaa",
    });
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("falha se recipients vazios", async () => {
    const result = await sendDebugReport({
      input: baseInput(),
      reporter: { email: "u@x.com", name: "U" },
      orgName: null,
      recipients: [],
      send: vi.fn(),
    });
    expect(result).toEqual({ ok: false, error: "recipients_missing" });
  });

  it("falha se screenshot exceder 4MB", async () => {
    const input = baseInput();
    input.screenshotBase64 = "x".repeat(4 * 1024 * 1024 + 1);
    const result = await sendDebugReport({
      input,
      reporter: { email: "u@x.com", name: "U" },
      orgName: null,
      recipients: ["ops@x.com"],
      send: vi.fn(),
    });
    expect(result).toEqual({ ok: false, error: "screenshot_too_large" });
  });

  it("envia com anexos e replyTo", async () => {
    const send = vi.fn(async () => ({ ok: true as const }));
    const result = await sendDebugReport({
      input: baseInput(),
      reporter: { email: "ana@x.com", name: "Ana" },
      orgName: "Acme",
      recipients: ["ops@x.com"],
      send,
    });
    expect(result).toEqual({ ok: true });
    expect(send).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["ops@x.com"],
        replyTo: "ana@x.com",
        attachments: [
          expect.objectContaining({ filename: "screenshot.png" }),
          expect.objectContaining({ filename: "session-log.json" }),
        ],
      }),
    );
  });
});
