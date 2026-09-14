import type { SessionLogEvent, SubmitDebugReportInput } from "./schemas";
import { DEBUG_REPORT_MAX_SCREENSHOT_BASE64 } from "./schemas";
import { sendEmail, type SendEmailResult } from "@/lib/email";

const SECRET_REDACT_PATTERN =
  /(authorization|bearer|access[_-]?token|refresh[_-]?token|api[_-]?key|password|senha|secret)\s*[:=]\s*["']?[^\s"',}]+/gi;

export type DebugReportSendError =
  | "screenshot_too_large"
  | "recipients_missing"
  | "email_failed";

export type SendDebugReportResult =
  | { ok: true }
  | { ok: false; error: DebugReportSendError };

export type DebugReportReporter = {
  email: string;
  name: string;
};

export function redactSecrets(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [REDACTED]")
    .replace(SECRET_REDACT_PATTERN, "$1=[REDACTED]");
}

export function sanitizeSessionLog(sessionLog: SessionLogEvent[]): SessionLogEvent[] {
  return sessionLog.map((event) => ({
    ...event,
    message: redactSecrets(event.message),
    meta: event.meta
      ? Object.fromEntries(
          Object.entries(event.meta).map(([key, value]) => [
            key,
            typeof value === "string" ? redactSecrets(value) : value,
          ]),
        )
      : event.meta,
  }));
}

export function parseDebugReportRecipients(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

export function stripDataUrlPrefix(base64: string): string {
  const commaIndex = base64.indexOf(",");
  return commaIndex >= 0 ? base64.slice(commaIndex + 1) : base64;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function logBadgeColor(type: SessionLogEvent["type"]): string {
  if (type === "navigation") return "#3b82f6";
  if (type === "click") return "#10b981";
  if (type === "console.warn") return "#f59e0b";
  if (type === "api.error") return "#f0883e";
  if (type === "unhandledrejection") return "#8b5cf6";
  return "#ef4444";
}

function renderSessionLogsHtml(sessionLog: SessionLogEvent[]): string {
  if (sessionLog.length === 0) {
    return `<div style="color:#94a3b8;font-style:italic;">Nenhum evento registrado nesta sessao.</div>`;
  }
  return sessionLog
    .map((event) => {
      let time = "";
      try {
        time = event.ts ? new Date(event.ts).toLocaleTimeString("pt-BR") : "";
      } catch {
        time = event.ts ? event.ts.slice(11, 19) : "";
      }
      const metaFormatted =
        event.meta && Object.keys(event.meta).length > 0
          ? ` <span style="color:#94a3b8;font-size:11px;">(${escapeHtml(JSON.stringify(event.meta))})</span>`
          : "";
      return `<div style="border-bottom:1px solid #1e293b;padding:6px 0;word-break:break-all;">
        <span style="color:#64748b;font-size:11px;">[${escapeHtml(time)}]</span>
        <span style="background-color:${logBadgeColor(event.type)};color:#ffffff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;text-transform:uppercase;margin:0 4px;display:inline-block;">${escapeHtml(event.type)}</span>
        <span style="color:#f8fafc;font-weight:500;">${escapeHtml(event.message)}</span>${metaFormatted}
      </div>`;
    })
    .join("");
}

export function buildDebugReportEmailHtml(params: {
  title: string;
  description: string;
  notes?: string;
  reporterName: string;
  reporterEmail: string;
  orgName: string | null;
  clientMeta: SubmitDebugReportInput["clientMeta"];
  sessionLog: SessionLogEvent[];
  screenshotBase64: string;
}): string {
  const cleanBase64 = stripDataUrlPrefix(params.screenshotBase64);
  const screenshotDataUrl = `data:image/png;base64,${cleanBase64}`;
  const notesHtml = params.notes
    ? `<div style="margin-bottom:20px;">
        <h2 style="margin:0 0 8px 0;font-size:13px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.5px;">Observacoes Adicionais</h2>
        <div style="background-color:#fffbeb;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:0 8px 8px 0;font-size:14px;line-height:1.6;color:#92400e;">
          ${escapeHtml(params.notes).replaceAll("\n", "<br>")}
        </div>
      </div>`
    : "";
  const workspaceRow = params.clientMeta.workspace
    ? `<tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:8px 0;color:#64748b;font-weight:600;">Org:</td>
        <td style="padding:8px 0;color:#0f172a;">${escapeHtml(params.clientMeta.workspace)}</td>
      </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>[Debug Report] ${escapeHtml(params.title)}</title></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:680px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #cbd5e1;">
        <tr>
          <td style="background-color:#0f172a;padding:24px;color:#ffffff;">
            <span style="background-color:#ef4444;color:#ffffff;font-size:11px;font-weight:700;padding:4px 8px;border-radius:4px;text-transform:uppercase;letter-spacing:0.5px;display:inline-block;margin-bottom:8px;">Relatorio de Bug</span>
            <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">${escapeHtml(params.title)}</h1>
          </td>
        </tr>
        <tr>
          <td style="background-color:#f8fafc;padding:12px 24px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#475569;">
            <strong>Reportado por:</strong> ${escapeHtml(params.reporterName)}
            (&lt;<a href="mailto:${escapeHtml(params.reporterEmail)}" style="color:#2563eb;">${escapeHtml(params.reporterEmail)}</a>&gt;)
            &nbsp;·&nbsp; <strong>Org:</strong> ${escapeHtml(params.orgName ?? "N/A")}
          </td>
        </tr>
        <tr>
          <td style="padding:24px;">
            <h2 style="margin:0 0 8px 0;font-size:13px;font-weight:700;color:#475569;text-transform:uppercase;">Descricao do Problema</h2>
            <div style="background-color:#f8fafc;border-left:4px solid #3b82f6;padding:14px 16px;border-radius:0 8px 8px 0;font-size:14px;line-height:1.6;">
              ${escapeHtml(params.description).replaceAll("\n", "<br>")}
            </div>
            ${notesHtml}
            <h2 style="margin:24px 0 10px 0;font-size:13px;font-weight:700;color:#475569;text-transform:uppercase;">Contexto Tecnico</h2>
            <table width="100%" role="presentation" style="border-collapse:collapse;font-size:13px;">
              <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:8px 0;color:#64748b;width:120px;font-weight:600;">URL:</td>
                <td style="padding:8px 0;word-break:break-all;"><a href="${escapeHtml(params.clientMeta.url)}" style="color:#2563eb;">${escapeHtml(params.clientMeta.url)}</a></td>
              </tr>
              <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:8px 0;color:#64748b;font-weight:600;">Viewport:</td>
                <td style="padding:8px 0;">${params.clientMeta.viewport.width} x ${params.clientMeta.viewport.height} px</td>
              </tr>
              ${workspaceRow}
              <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:8px 0;color:#64748b;font-weight:600;">Navegador:</td>
                <td style="padding:8px 0;font-size:12px;font-family:monospace;">${escapeHtml(params.clientMeta.userAgent)}</td>
              </tr>
            </table>
            <h2 style="margin:24px 0 10px 0;font-size:13px;font-weight:700;color:#475569;text-transform:uppercase;">Captura de Tela</h2>
            <div style="border:1px solid #cbd5e1;border-radius:8px;overflow:hidden;background-color:#0f172a;padding:12px;">
              <img src="${screenshotDataUrl}" alt="Captura de Tela" style="max-width:100%;height:auto;display:block;margin:0 auto;" />
            </div>
            <h2 style="margin:24px 0 10px 0;font-size:13px;font-weight:700;color:#475569;text-transform:uppercase;">Logs (${params.sessionLog.length} eventos)</h2>
            <div style="background-color:#0f172a;border-radius:8px;padding:16px;font-family:Consolas,Monaco,monospace;font-size:12px;line-height:1.5;color:#e2e8f0;">
              ${renderSessionLogsHtml(params.sessionLog)}
            </div>
          </td>
        </tr>
        <tr>
          <td style="background-color:#f8fafc;padding:16px 24px;border-top:1px solid #e2e8f0;text-align:center;font-size:12px;color:#94a3b8;">
            Agify — Relatorio de debug. Anexos: screenshot.png e session-log.json.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildDebugReportEmailText(params: {
  title: string;
  description: string;
  notes?: string;
  reporterName: string;
  reporterEmail: string;
  orgName: string | null;
  url: string;
}): string {
  const notes = params.notes ? `\nNotas:\n${params.notes}\n` : "";
  return `[Debug Report] ${params.title}\n\n${params.description}\n${notes}\nPor: ${params.reporterName} <${params.reporterEmail}>\nOrg: ${params.orgName ?? "N/A"}\nURL: ${params.url}\n`;
}

export async function sendDebugReport(params: {
  input: SubmitDebugReportInput;
  reporter: DebugReportReporter;
  orgName: string | null;
  recipients: string[];
  send?: (opts: Parameters<typeof sendEmail>[0]) => Promise<SendEmailResult>;
}): Promise<SendDebugReportResult> {
  if (params.input.screenshotBase64.length > DEBUG_REPORT_MAX_SCREENSHOT_BASE64) {
    return { ok: false, error: "screenshot_too_large" };
  }
  if (params.recipients.length === 0) {
    return { ok: false, error: "recipients_missing" };
  }

  const sessionLog = sanitizeSessionLog(params.input.sessionLog);
  const html = buildDebugReportEmailHtml({
    title: params.input.title,
    description: params.input.description,
    notes: params.input.notes,
    reporterName: params.reporter.name,
    reporterEmail: params.reporter.email,
    orgName: params.orgName,
    clientMeta: params.input.clientMeta,
    sessionLog,
    screenshotBase64: params.input.screenshotBase64,
  });
  const text = buildDebugReportEmailText({
    title: params.input.title,
    description: params.input.description,
    notes: params.input.notes,
    reporterName: params.reporter.name,
    reporterEmail: params.reporter.email,
    orgName: params.orgName,
    url: params.input.clientMeta.url,
  });

  const dispatch = params.send ?? sendEmail;
  const result = await dispatch({
    to: params.recipients,
    subject: `[Debug Report] ${params.input.title}`,
    html,
    text,
    replyTo: params.reporter.email,
    attachments: [
      { filename: "screenshot.png", contentBase64: stripDataUrlPrefix(params.input.screenshotBase64) },
      {
        filename: "session-log.json",
        contentBase64: Buffer.from(JSON.stringify(sessionLog, null, 2), "utf8").toString("base64"),
      },
    ],
  });

  if (!result.ok) return { ok: false, error: "email_failed" };
  return { ok: true };
}
