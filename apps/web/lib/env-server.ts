let resendWarned = false;

/** Avisos de configuracao em producao (nao quebra build). */
export function warnProductionEmailEnv(): void {
  if (process.env.NODE_ENV !== "production" || resendWarned) return;
  resendWarned = true;

  if (!process.env.RESEND_API_KEY?.trim()) {
    console.warn("[env] Producao: RESEND_API_KEY ausente — convites sem envio de email.");
  }

  const from = process.env.RESEND_FROM ?? "";
  if (!from.includes("@")) {
    console.warn("[env] Producao: RESEND_FROM invalido ou ausente.");
  }

  if (!process.env.NEXT_PUBLIC_APP_URL?.trim()) {
    console.warn("[env] Producao: NEXT_PUBLIC_APP_URL ausente — links de convite podem falhar.");
  }
}
