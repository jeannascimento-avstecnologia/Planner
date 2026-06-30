const RESEND_API_URL = "https://api.resend.com/emails";

export type EmailSendErrorCode =
  | "missing_api_key"
  | "domain_not_verified"
  | "invalid_from"
  | "rate_limited"
  | "unknown";

export type SendEmailResult = { ok: true } | { ok: false; code: EmailSendErrorCode };

export type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

function mapResendError(status: number, body: string): EmailSendErrorCode {
  const lower = body.toLowerCase();
  if (status === 429) return "rate_limited";
  if (lower.includes("domain") && (lower.includes("verify") || lower.includes("not verified"))) {
    return "domain_not_verified";
  }
  if (lower.includes("from") || lower.includes("sender")) return "invalid_from";
  return "unknown";
}

export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? "Agify <noreply@agify.app>";

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      console.warn("[email] RESEND_API_KEY ausente em producao.");
    }
    return { ok: false, code: "missing_api_key" };
  }

  if (!from.includes("@")) {
    console.error("[email] RESEND_FROM invalido (sem @).");
    return { ok: false, code: "invalid_from" };
  }

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const code = mapResendError(res.status, body);
    console.error("[email] Resend falhou", { status: res.status, code });
    return { ok: false, code };
  }

  return { ok: true };
}
