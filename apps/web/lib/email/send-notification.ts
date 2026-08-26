import "server-only";

import { EMAIL_FROM, resend } from "@/lib/email/resend-client";

export type SendNotificationInput = {
  to: string;
  subject: string;
  html: string;
};

export async function sendNotificationEmail(
  input: SendNotificationInput,
): Promise<{ ok: true } | { error: string }> {
  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    if (error) {
      console.error("[email] notification send failed", error.message);
      return { error: error.message };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] notification send failed", err);
    return { error: "send_failed" };
  }
}
