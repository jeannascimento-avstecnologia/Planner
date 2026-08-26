import { escapeHtml } from "@/lib/email/escape-html";
import { emailButton, wrapEmailHtml } from "@/lib/email/templates/email-shell";

export type TaskOverdueTemplateParams = {
  taskTitle: string;
  projectName: string;
  dueDate: string;
  boardUrl: string;
};

export function buildTaskOverdueEmail(params: TaskOverdueTemplateParams): { subject: string; html: string } {
  const subject = `Tarefa vencida: ${params.taskTitle}`;
  const body = `
    <h1 style="margin:0 0 12px;font-size:20px;">Tarefa vencida</h1>
    <p style="margin:0;">A tarefa <strong>${escapeHtml(params.taskTitle)}</strong> no projeto <strong>${escapeHtml(params.projectName)}</strong> esta vencida desde <strong>${escapeHtml(params.dueDate)}</strong>.</p>
    ${emailButton(params.boardUrl, "Resolver agora")}
  `;
  return {
    subject,
    html: wrapEmailHtml(subject, body, `A tarefa ${params.taskTitle} esta vencida`),
  };
}
