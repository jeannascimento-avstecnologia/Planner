import "server-only";

const RESEND_API_URL = "https://api.resend.com/emails";

export const EMAIL_FROM = process.env.RESEND_FROM ?? "Agify <noreply@agify.app>";

type ResendSendPayload = {
  from: string;
  to: string;
  subject: string;
  html: string;
};

type ResendSendResult = { data: { id: string } | null; error: { message: string } | null };

/** Resend-compatible client (fetch; swap to `import { Resend } from "resend"` when package is installed). */
export const resend = {
  emails: {
    async send(payload: ResendSendPayload): Promise<ResendSendResult> {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        return { data: null, error: { message: "missing_api_key" } };
      }

      const res = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return { data: null, error: { message: body || `http_${res.status}` } };
      }

      const data = (await res.json().catch(() => null)) as { id?: string } | null;
      return { data: data?.id ? { id: data.id } : null, error: null };
    },
  },
};
