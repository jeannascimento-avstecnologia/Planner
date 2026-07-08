"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePlanViews } from "@/lib/revalidation";

export type PlanActionResult = { ok: true } | { ok: false; error: string };

const upsertSchema = z.object({
  cardId: z.string().uuid(),
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hours: z.number().min(0).max(24),
});

const moveSchema = z.object({
  cardId: z.string().uuid(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hours: z.number().min(0).max(24).optional(),
});

const scheduleSchema = z.object({
  cardId: z.string().uuid(),
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  defaultHours: z.number().min(0).max(24).optional(),
});

const addToPlanSchema = z.object({
  cardId: z.string().uuid(),
});

const removeFromPlanSchema = z.object({
  cardId: z.string().uuid(),
});

const spreadSchema = z.object({
  cardId: z.string().uuid(),
  totalHours: z.number().min(0.5).max(999),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const teamsConfigSchema = z.object({
  orgId: z.string().uuid(),
  teamId: z.string().min(1),
  channelId: z.string().min(1),
  planId: z.string().min(1),
  bucketId: z.string().min(1),
  tenantId: z.string().optional(),
});

function revalidateAfterPlanMutation(userId?: string) {
  revalidatePlanViews(userId);
}

async function revalidatePlanForClient(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  revalidateAfterPlanMutation(user?.id);
}

export async function upsertAllocationAction(input: unknown): Promise<PlanActionResult> {
  const parsed = upsertSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("upsert_card_allocation", {
    p_card_id: parsed.data.cardId,
    p_work_date: parsed.data.workDate,
    p_hours: parsed.data.hours,
  });
  if (error) return { ok: false, error: error.message };

  await revalidatePlanForClient(supabase);
  return { ok: true };
}

export async function moveAllocationAction(input: unknown): Promise<PlanActionResult> {
  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("move_card_allocation", {
    p_card_id: parsed.data.cardId,
    p_from_date: parsed.data.fromDate,
    p_to_date: parsed.data.toDate,
    p_hours: parsed.data.hours ?? null,
  });
  if (error) return { ok: false, error: error.message };

  await revalidatePlanForClient(supabase);
  return { ok: true };
}

export async function scheduleCardToDayAction(input: unknown): Promise<PlanActionResult> {
  const parsed = scheduleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const defaultHours = parsed.data.defaultHours ?? 0;

  const supabase = await createClient();
  const { error } = await supabase.rpc("schedule_card_to_day", {
    p_card_id: parsed.data.cardId,
    p_work_date: parsed.data.workDate,
    p_default_hours: defaultHours,
  });
  if (error) return { ok: false, error: error.message };

  await revalidatePlanForClient(supabase);
  return { ok: true };
}

export async function addCardToPersonalPlanAction(input: unknown): Promise<PlanActionResult> {
  const parsed = addToPlanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_card_to_personal_plan", {
    p_card_id: parsed.data.cardId,
  });
  if (error) return { ok: false, error: error.message };

  await revalidatePlanForClient(supabase);
  return { ok: true };
}

export async function clearCardFromPlanAction(input: unknown): Promise<PlanActionResult> {
  const parsed = removeFromPlanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_card_from_personal_plan", {
    p_card_id: parsed.data.cardId,
  });
  if (error) return { ok: false, error: error.message };

  await revalidatePlanForClient(supabase);
  return { ok: true };
}

export async function bulkSpreadHoursAction(input: unknown): Promise<PlanActionResult> {
  const parsed = spreadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("bulk_spread_card_hours", {
    p_card_id: parsed.data.cardId,
    p_total_hours: parsed.data.totalHours,
    p_start: parsed.data.startDate,
    p_end: parsed.data.endDate,
  });
  if (error) return { ok: false, error: error.message };

  await revalidatePlanForClient(supabase);
  return { ok: true };
}

export async function saveTeamsIntegrationAction(input: unknown): Promise<PlanActionResult> {
  const parsed = teamsConfigSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("upsert_org_teams_integration", {
    p_org: parsed.data.orgId,
    p_team_id: parsed.data.teamId,
    p_channel_id: parsed.data.channelId,
    p_plan_id: parsed.data.planId,
    p_bucket_id: parsed.data.bucketId,
    p_tenant_id: parsed.data.tenantId ?? null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings/integrations/teams");
  return { ok: true };
}

export async function exportPlanToTeamsAction(orgId: string): Promise<
  { ok: true; exported: number } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nao autenticado." };

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return { ok: false, error: "Sessao invalida." };

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/export-plan-to-teams`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ orgId }),
  });

  const body = (await res.json()) as { exported?: number; error?: string };
  if (!res.ok) return { ok: false, error: body.error ?? "Falha ao exportar." };
  return { ok: true, exported: body.exported ?? 0 };
}

export async function getMicrosoftOAuthUrlAction(): Promise<{ url: string } | { error: string }> {
  const clientId = process.env.AZURE_CLIENT_ID;
  const redirectUri = process.env.MICROSOFT_OAUTH_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return { error: "Integracao Microsoft nao configurada no servidor." };
  }
  const scope = encodeURIComponent("Tasks.ReadWrite Group.Read.All User.Read offline_access");
  const state = crypto.randomUUID();
  const url =
    `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
    `client_id=${encodeURIComponent(clientId)}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${scope}&state=${state}&response_mode=query`;
  return { url };
}
