import { PRODUCT_NAME } from "@/lib/brand";
import { escapeHtml } from "@/lib/email/escape-html";
import { emailButton, wrapEmailHtml } from "@/lib/email/templates/email-shell";

export type ProjectCreatedTemplateParams = {
  projectName: string;
  creatorName: string;
  boardUrl: string;
};

export function buildProjectCreatedEmail(params: ProjectCreatedTemplateParams): { subject: string; html: string } {
  const subject = `Novo projeto: ${params.projectName}`;
  const body = `
    <h1 style="margin:0 0 12px;font-size:20px;">Novo projeto criado</h1>
    <p style="margin:0;"><strong>${escapeHtml(params.creatorName)}</strong> criou o projeto <strong>${escapeHtml(params.projectName)}</strong> no ${PRODUCT_NAME}.</p>
    ${emailButton(params.boardUrl, "Abrir projeto")}
  `;
  return {
    subject,
    html: wrapEmailHtml(subject, body, `Novo projeto: ${params.projectName}`),
  };
}
