import { escapeHtml } from "@/lib/email/escape-html";
import { emailButton, wrapEmailHtml } from "@/lib/email/templates/email-shell";

export type ScheduleCreatedTemplateParams = {
  taskTitle: string;
  projectName: string;
  workDate: string;
  boardUrl: string;
};

export function buildScheduleCreatedEmail(params: ScheduleCreatedTemplateParams): { subject: string; html: string } {
  const subject = `Agendamento: ${params.taskTitle}`;
  const body = `
    <h1 style="margin:0 0 12px;font-size:20px;">Novo agendamento</h1>
    <p style="margin:0;">A tarefa <strong>${escapeHtml(params.taskTitle)}</strong> no projeto <strong>${escapeHtml(params.projectName)}</strong> foi agendada para <strong>${escapeHtml(params.workDate)}</strong>.</p>
    ${emailButton(params.boardUrl, "Ver plano")}
  `;
  return {
    subject,
    html: wrapEmailHtml(subject, body, `Agendamento em ${params.workDate}`),
  };
}
