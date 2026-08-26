import { escapeHtml } from "@/lib/email/escape-html";
import { emailButton, wrapEmailHtml } from "@/lib/email/templates/email-shell";

export type TaskDueSoonTemplateParams = {
  taskTitle: string;
  projectName: string;
  dueDate: string;
  boardUrl: string;
};

export function buildTaskDueSoonEmail(params: TaskDueSoonTemplateParams): { subject: string; html: string } {
  const subject = `Prazo em 3 dias: ${params.taskTitle}`;
  const body = `
    <h1 style="margin:0 0 12px;font-size:20px;">Prazo se aproximando</h1>
    <p style="margin:0;">A tarefa <strong>${escapeHtml(params.taskTitle)}</strong> no projeto <strong>${escapeHtml(params.projectName)}</strong> vence em <strong>${escapeHtml(params.dueDate)}</strong> (3 dias).</p>
    ${emailButton(params.boardUrl, "Ver tarefa")}
  `;
  return {
    subject,
    html: wrapEmailHtml(subject, body, `A tarefa ${params.taskTitle} vence em 3 dias`),
  };
}
