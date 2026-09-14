import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/loaders/session";
import { getActiveOrgDisplay } from "@/lib/active-org";
import { rateLimitAction } from "@/lib/rate-limit";
import {
  SubmitDebugReportInputSchema,
  DEBUG_REPORT_RATE_LIMIT,
  DEBUG_REPORT_RATE_WINDOW_MS,
} from "@/lib/debug-report/schemas";
import {
  parseDebugReportRecipients,
  sendDebugReport,
} from "@/lib/debug-report/send-debug-report";

export const maxDuration = 60;

const ERROR_STATUS: Record<string, number> = {
  screenshot_too_large: 400,
  recipients_missing: 400,
  email_failed: 502,
};

const ERROR_MESSAGE: Record<string, string> = {
  screenshot_too_large: "Captura muito grande.",
  recipients_missing: "Destinatarios de debug nao configurados.",
  email_failed: "Falha ao enviar e-mail.",
};

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const rl = await rateLimitAction(
    user.id,
    "debug-report",
    DEBUG_REPORT_RATE_LIMIT,
    DEBUG_REPORT_RATE_WINDOW_MS,
  );
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Limite de 5 relatorios por hora. Tente novamente mais tarde." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  const parsed = SubmitDebugReportInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  const org = await getActiveOrgDisplay();
  const recipients = parseDebugReportRecipients(process.env.DEBUG_REPORT_RECIPIENTS);

  const result = await sendDebugReport({
    input: parsed.data,
    reporter: {
      email: user.email,
      name: profile?.full_name?.trim() || user.email,
    },
    orgName: org?.name ?? null,
    recipients,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: ERROR_MESSAGE[result.error] ?? "Falha ao enviar relatorio." },
      { status: ERROR_STATUS[result.error] ?? 400 },
    );
  }

  return NextResponse.json({ data: { success: true } }, { status: 201 });
}
