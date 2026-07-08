import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type OutboxRow = {
  id: string;
  org_id: string;
  board_id: string;
  rule_id: string | null;
  card_id: string | null;
  card_event_id: number | null;
  action_type: string;
  action_payload: Record<string, unknown>;
  attempts: number;
};

async function deliverSlack(supabase: ReturnType<typeof createClient>, orgId: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase.rpc("get_org_slack_webhook", { p_org: orgId });
  if (error || !data?.length) throw new Error(error?.message ?? "slack_not_configured");
  const webhookUrl = data[0].webhook_url as string;
  const text = String(payload.message ?? payload.text ?? "Automacao Planner");
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`slack_http_${res.status}`);
}

async function deliverEmail(payload: Record<string, unknown>) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM") ?? "Planner <onboarding@resend.dev>";
  if (!apiKey) throw new Error("resend_not_configured");
  const to = String(payload.to ?? "");
  const subject = String(payload.subject ?? "Notificacao Planner");
  const html = String(payload.html ?? payload.message ?? "Evento de automacao");
  if (!to) throw new Error("email_to_required");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!res.ok) throw new Error(`resend_http_${res.status}`);
}

async function deliverWebhook(payload: Record<string, unknown>) {
  const url = String(payload.url ?? "");
  if (!url) throw new Error("webhook_url_required");
  const secret = String(payload.secret ?? Deno.env.get("AUTOMATION_WEBHOOK_HMAC_SECRET") ?? "");
  const body = JSON.stringify(payload.body ?? payload);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secret) {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
    const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
    headers["X-Planner-Signature"] = hex;
  }
  const res = await fetch(url, { method: "POST", headers, body });
  if (!res.ok) throw new Error(`webhook_http_${res.status}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const limit = 25;
  const { data: rows, error } = await supabase
    .from("automation_outbox")
    .select("*")
    .in("status", ["pending", "failed"])
    .lte("next_attempt_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }

  let processed = 0;
  for (const row of (rows ?? []) as OutboxRow[]) {
    await supabase.from("automation_outbox").update({ status: "processing", updated_at: new Date().toISOString() }).eq("id", row.id);

    try {
      if (row.action_type === "send_slack") {
        await deliverSlack(supabase, row.org_id, row.action_payload);
      } else if (row.action_type === "send_email") {
        await deliverEmail(row.action_payload);
      } else if (row.action_type === "webhook") {
        await deliverWebhook(row.action_payload);
      } else {
        throw new Error(`unsupported_action:${row.action_type}`);
      }

      await supabase
        .from("automation_outbox")
        .update({ status: "success", result: { ok: true }, updated_at: new Date().toISOString() })
        .eq("id", row.id);

      if (row.rule_id) {
        await supabase.from("automation_runs").insert({
          rule_id: row.rule_id,
          card_event_id: row.card_event_id,
          status: "success",
          depth: 0,
          result: { outbox_id: row.id, action_type: row.action_type },
        });
      }
      processed++;
    } catch (e) {
      const attempts = row.attempts + 1;
      const backoffMin = Math.min(60, 2 ** attempts);
      const next = new Date(Date.now() + backoffMin * 60_000).toISOString();
      await supabase
        .from("automation_outbox")
        .update({
          status: attempts >= 5 ? "failed" : "pending",
          attempts,
          next_attempt_at: next,
          result: { error: e instanceof Error ? e.message : String(e) },
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      if (row.rule_id) {
        await supabase.from("automation_runs").insert({
          rule_id: row.rule_id,
          card_event_id: row.card_event_id,
          status: "failed",
          depth: 0,
          result: { outbox_id: row.id, error: e instanceof Error ? e.message : String(e) },
        });
      }
    }
  }

  return new Response(JSON.stringify({ processed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
