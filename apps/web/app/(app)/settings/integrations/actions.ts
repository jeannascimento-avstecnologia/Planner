"use server";

import { revalidateIntegrations } from "@/lib/revalidation";
import { createClient } from "@/lib/supabase/server";
import { isOrgAdminRole } from "@/lib/org-member-roles";

export type IntegrationActionResult = { ok: true } | { ok: false; error: string };

export async function saveSlackIntegrationAction(input: {
  orgId: string;
  webhookUrl: string;
  channelLabel?: string;
}): Promise<IntegrationActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nao autenticado." };

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("org_id", input.orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership || !isOrgAdminRole(membership.role)) {
    return { ok: false, error: "Sem permissao." };
  }

  const { error } = await supabase.rpc("set_org_slack_webhook", {
    p_org: input.orgId,
    p_webhook_url: input.webhookUrl,
    p_channel_label: input.channelLabel ?? null,
  });
  if (error) return { ok: false, error: error.message };

  revalidateIntegrations(input.orgId);
  return { ok: true };
}

export async function testSlackIntegrationAction(orgId: string): Promise<IntegrationActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nao autenticado." };

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership || !isOrgAdminRole(membership.role)) {
    return { ok: false, error: "Sem permissao." };
  }

  const service = await import("@/lib/supabase/service").then((m) => m.tryCreateServiceClient());
  if (!service) return { ok: false, error: "Service role indisponivel." };

  const { data: webhookRows } = await service.rpc("get_org_slack_webhook", { p_org: orgId });
  const webhookUrl = webhookRows?.[0]?.webhook_url as string | undefined;
  if (!webhookUrl) return { ok: false, error: "Webhook Slack nao configurado." };

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "Teste de integracao Slack — Planner" }),
  });
  if (!res.ok) return { ok: false, error: `Slack HTTP ${res.status}` };
  return { ok: true };
}

export async function saveGoogleIntegrationAction(input: {
  orgId: string;
  calendarId: string;
}): Promise<IntegrationActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nao autenticado." };

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("org_id", input.orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership || !isOrgAdminRole(membership.role)) {
    return { ok: false, error: "Sem permissao." };
  }

  const { error } = await supabase.from("org_google_integrations").upsert({
    org_id: input.orgId,
    calendar_id: input.calendarId,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };

  revalidateIntegrations(input.orgId);
  return { ok: true };
}

export async function getGoogleOAuthUrlAction(): Promise<{ url: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nao autenticado." };

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !redirectUri) return { error: "Google OAuth nao configurado." };

  const scope = encodeURIComponent("https://www.googleapis.com/auth/calendar.events offline_access");
  const url =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${scope}&access_type=offline&prompt=consent`;
  return { url };
}

export async function exportDeadlinesToGoogleAction(orgId: string): Promise<
  { ok: true; exported: number } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nao autenticado." };

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership || !isOrgAdminRole(membership.role)) {
    return { ok: false, error: "Sem permissao." };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return { ok: false, error: "Sessao invalida." };

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/export-deadlines-to-google`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ orgId }),
  });
  const json = (await res.json()) as { exported?: number; error?: string };
  if (!res.ok) return { ok: false, error: json.error ?? `HTTP ${res.status}` };
  return { ok: true, exported: json.exported ?? 0 };
}
