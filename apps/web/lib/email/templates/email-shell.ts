import { AGIFY_EMAIL } from "@/lib/email-templates/agify-email-brand";
import { escapeHtml } from "@/lib/email/escape-html";

export function wrapEmailHtml(title: string, bodyHtml: string, preheader?: string): string {
  const pre = preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>` : "";
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${AGIFY_EMAIL.bg};font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:${AGIFY_EMAIL.fg};">
  ${pre}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${AGIFY_EMAIL.bg};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:${AGIFY_EMAIL.surface};border-radius:${AGIFY_EMAIL.radius};border:1px solid ${AGIFY_EMAIL.border};">
        <tr><td style="padding:32px 28px;line-height:1.6;font-size:15px;">
          ${bodyHtml}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function emailButton(href: string, label: string): string {
  return `<p style="margin:24px 0 0;">
    <a href="${escapeHtml(href)}" style="display:inline-block;background:${AGIFY_EMAIL.brand};color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;">${escapeHtml(label)}</a>
  </p>`;
}
