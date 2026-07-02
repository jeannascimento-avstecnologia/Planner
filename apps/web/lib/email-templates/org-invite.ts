import { orgRoleLabel } from "@/lib/org-member-roles";
import { PRODUCT_NAME } from "@/lib/brand";
import { AGIFY_EMAIL, agifyLogoSrc } from "@/lib/email-templates/agify-email-brand";
import { escapeHtml } from "@/lib/email-templates/board-invite";

export type OrgInviteEmailParams = {
  to: string;
  orgName: string;
  inviterName: string;
  role: string;
  inviteUrl: string;
  appUrl: string;
  expiresAt: Date;
};

export function buildOrgInviteEmail(params: OrgInviteEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const roleLabel = orgRoleLabel(params.role);
  const expires = params.expiresAt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const subject = `Convite para ${params.orgName} — ${PRODUCT_NAME}`;
  const logoSrc = agifyLogoSrc(params.appUrl);
  const preheader = `${params.inviterName} convidou voce para a organizacao ${params.orgName}.`;

  const text = [
    `${PRODUCT_NAME} | Convite de organizacao`,
    "",
    `${params.inviterName} convidou voce para participar da organizacao "${params.orgName}" no ${PRODUCT_NAME}.`,
    `Nivel de acesso: ${roleLabel}.`,
    `Aceite o convite (valido ate ${expires}):`,
    params.inviteUrl,
    "",
    "Se voce nao esperava este convite, ignore este email.",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${AGIFY_EMAIL.bg};font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:${AGIFY_EMAIL.fg};-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${AGIFY_EMAIL.bg};padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:524px;background:${AGIFY_EMAIL.brandGradient};border-radius:18px;padding:2px;box-shadow:0 4px 24px rgba(99,102,241,0.12);">
        <tr><td>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:${AGIFY_EMAIL.surface};border-radius:${AGIFY_EMAIL.radius};overflow:hidden;">
        <tr>
          <td style="padding:36px 32px 12px;text-align:center;">
            <img src="${escapeHtml(logoSrc)}" alt="${escapeHtml(PRODUCT_NAME)}" width="180" height="43" style="display:block;margin:0 auto;max-width:180px;height:auto;border:0;" />
          </td>
        </tr>
        <tr>
          <td style="padding:8px 32px 32px;text-align:center;">
            <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;line-height:1.3;color:${AGIFY_EMAIL.fg};letter-spacing:-0.02em;">
              Voce foi convidado para uma organizacao
            </h1>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${AGIFY_EMAIL.muted};">
              <strong style="color:${AGIFY_EMAIL.fg};">${escapeHtml(params.inviterName)}</strong> convidou voce para
              <strong style="color:${AGIFY_EMAIL.fg};">${escapeHtml(params.orgName)}</strong>.
            </p>
            <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 28px;background:${AGIFY_EMAIL.bg};border-radius:12px;border:1px solid ${AGIFY_EMAIL.border};">
              <tr>
                <td style="padding:14px 20px;font-size:13px;line-height:1.5;color:${AGIFY_EMAIL.muted};text-align:left;">
                  <span style="display:block;margin-bottom:4px;">Nivel de acesso</span>
                  <strong style="font-size:14px;color:${AGIFY_EMAIL.fg};">${escapeHtml(roleLabel)}</strong>
                  <span style="display:block;margin-top:10px;margin-bottom:4px;">Validade</span>
                  <strong style="font-size:14px;color:${AGIFY_EMAIL.fg};">ate ${escapeHtml(expires)}</strong>
                </td>
              </tr>
            </table>
            <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
              <tr>
                <td style="border-radius:10px;background:${AGIFY_EMAIL.brand};">
                  <a href="${escapeHtml(params.inviteUrl)}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;line-height:1;letter-spacing:0.01em;">
                    Aceitar convite
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:28px 0 0;font-size:12px;line-height:1.6;color:${AGIFY_EMAIL.subtle};">
              Ou copie este link no navegador:<br>
              <a href="${escapeHtml(params.inviteUrl)}" style="color:${AGIFY_EMAIL.link};word-break:break-all;text-decoration:underline;font-weight:500;">${escapeHtml(params.inviteUrl)}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid ${AGIFY_EMAIL.border};text-align:center;font-size:11px;color:${AGIFY_EMAIL.subtle};line-height:1.5;">
            Se voce nao esperava este convite, ignore este email.
          </td>
        </tr>
      </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}
