import type { SubmitDebugReportInput } from "@/lib/debug-report";

export async function submitDebugReport(payload: SubmitDebugReportInput): Promise<void> {
  const response = await fetch("/api/debug-reports", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: unknown };
    const message = typeof body.error === "string" ? body.error : "Falha ao enviar relatório.";
    throw new Error(message);
  }
}
