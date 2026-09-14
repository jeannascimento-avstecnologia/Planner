import { z } from "zod";

export const SessionLogEventTypeSchema = z.enum([
  "navigation",
  "click",
  "console.error",
  "console.warn",
  "error",
  "unhandledrejection",
  "api.error",
]);

export const SessionLogEventSchema = z.object({
  ts: z.string().datetime(),
  type: SessionLogEventTypeSchema,
  message: z.string().max(2000),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const DebugReportAppSchema = z.enum(["planner-web"]);

export const DebugReportClientMetaSchema = z.object({
  url: z.string().url().max(2000),
  userAgent: z.string().max(500),
  viewport: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  app: DebugReportAppSchema,
  workspace: z.string().max(50).optional(),
});

export const SubmitDebugReportInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(5000),
  notes: z.string().trim().max(2000).optional(),
  screenshotBase64: z.string().min(1).max(4 * 1024 * 1024),
  sessionLog: z.array(SessionLogEventSchema).max(500),
  clientMeta: DebugReportClientMetaSchema,
});

export const DebugReportFormSchema = SubmitDebugReportInputSchema.pick({
  title: true,
  description: true,
  notes: true,
});

export type SessionLogEventType = z.infer<typeof SessionLogEventTypeSchema>;
export type SessionLogEvent = z.infer<typeof SessionLogEventSchema>;
export type DebugReportApp = z.infer<typeof DebugReportAppSchema>;
export type SubmitDebugReportInput = z.infer<typeof SubmitDebugReportInputSchema>;
export type DebugReportFormValues = z.infer<typeof DebugReportFormSchema>;

export const DEBUG_REPORT_MAX_SESSION_EVENTS = 200;
export const DEBUG_REPORT_MAX_SCREENSHOT_BASE64 = 4 * 1024 * 1024;
export const DEBUG_REPORT_RATE_LIMIT = 5;
export const DEBUG_REPORT_RATE_WINDOW_MS = 3_600_000;
