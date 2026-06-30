import type { EmailSendErrorCode } from "@/lib/email";

const EMAIL_SEND_USER_MESSAGES: Record<EmailSendErrorCode, string> = {
  missing_api_key: "Email nao configurado no servidor — copie o link abaixo.",
  domain_not_verified: "Dominio de email nao verificado — copie o link abaixo.",
  invalid_from: "Remetente de email invalido — copie o link abaixo.",
  rate_limited: "Limite de envio do provedor atingido — copie o link abaixo.",
  unknown: "Falha no envio — copie o link abaixo.",
};

export function inviteEmailFailureMessage(code: EmailSendErrorCode): string {
  return EMAIL_SEND_USER_MESSAGES[code];
}
