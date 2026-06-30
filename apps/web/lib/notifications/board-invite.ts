import { sendEmail, type EmailSendErrorCode, type SendEmailResult } from "@/lib/email";
import { buildBoardInviteEmail, type BoardInviteEmailParams } from "@/lib/email-templates/board-invite";

export type BoardInviteEmailResult = { ok: true } | { ok: false; code: EmailSendErrorCode };

export async function sendBoardInviteEmail(params: BoardInviteEmailParams): Promise<BoardInviteEmailResult> {
  const { subject, html, text } = buildBoardInviteEmail(params);
  const result: SendEmailResult = await sendEmail({ to: params.to, subject, html, text });
  if (result.ok) return { ok: true };
  return { ok: false, code: result.code };
}
