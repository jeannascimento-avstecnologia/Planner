import { sendEmail, type EmailSendErrorCode, type SendEmailResult } from "@/lib/email";
import { buildOrgInviteEmail, type OrgInviteEmailParams } from "@/lib/email-templates/org-invite";

export type OrgInviteEmailResult = { ok: true } | { ok: false; code: EmailSendErrorCode };

export async function sendOrgInviteEmail(params: OrgInviteEmailParams): Promise<OrgInviteEmailResult> {
  const { subject, html, text } = buildOrgInviteEmail(params);
  const result: SendEmailResult = await sendEmail({ to: params.to, subject, html, text });
  if (result.ok) return { ok: true };
  return { ok: false, code: result.code };
}
