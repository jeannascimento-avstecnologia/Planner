import { PRODUCT_NAME } from "@/lib/brand";
import { escapeHtml } from "@/lib/email/escape-html";
import { emailButton, wrapEmailHtml } from "@/lib/email/templates/email-shell";

export type TaskAssignedTemplateParams = {
  taskTitle: string;
  projectName: string;
  dueDate: string | null;
  assigneeName: string;
  assignerName: string;
  boardUrl: string;
};

export function buildTaskAssignedEmail(params: TaskAssignedTemplateParams): { subject: string; html: string } {
  const subject = `Voce foi atribuido: ${params.taskTitle}`;
  const dueLine = params.dueDate
    ? `<p style="margin:12px 0 0;color:#64748B;">Prazo: <strong>${escapeHtml(params.dueDate)}</strong></p>`
    : "";
  const body = `
    <h1 style="margin:0 0 12px;font-size:20px;">Nova atribuicao</h1>
    <p style="margin:0;"><strong>${escapeHtml(params.assignerName)}</strong> atribuiu voce a <strong>${escapeHtml(params.taskTitle)}</strong> no projeto <strong>${escapeHtml(params.projectName)}</strong>.</p>
    ${dueLine}
    ${emailButton(params.boardUrl, "Abrir no " + PRODUCT_NAME)}
  `;
  return {
    subject,
    html: wrapEmailHtml(subject, body, `${params.assignerName} atribuiu voce a ${params.taskTitle}`),
  };
}
