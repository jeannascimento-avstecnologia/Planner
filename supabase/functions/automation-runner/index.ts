import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-automation-depth",
};

interface CardEventRecord {
  id: number;
  org_id: string;
  board_id: string | null;
  card_id: string | null;
  event_type: string;
  payload: { meta?: { trigger_depth?: number } };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const secret = Deno.env.get("AUTOMATION_WEBHOOK_SECRET");
  const authHeader = req.headers.get("authorization");
  if (secret && authHeader !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const body = await req.json() as { record?: CardEventRecord };
  const record = body.record;
  if (!record) {
    return new Response(JSON.stringify({ error: "no record" }), { status: 400, headers: corsHeaders });
  }

  const headerDepth = Number(req.headers.get("x-automation-depth") ?? "0");
  const payloadDepth = record.payload?.meta?.trigger_depth ?? 0;
  const depth = Math.max(headerDepth, payloadDepth);
  if (depth >= 3) {
    return new Response(JSON.stringify({ skipped: "max_depth" }), { headers: corsHeaders });
  }

  let q = supabase.from("automation_rules").select("*").eq("enabled", true).eq("trigger_event_type", record.event_type);
  if (record.board_id) q = q.or(`board_id.eq.${record.board_id},board_id.is.null`);
  const { data: rules } = await q;

  let processed = 0;
  for (const rule of rules ?? []) {
    if (!record.card_id) continue;
    const { error } = await supabase.rpc("execute_automation_action", {
      p_rule_id: rule.id,
      p_card_id: record.card_id,
      p_action: (rule.actions as unknown[])?.[0] ?? {},
      p_depth: depth + 1,
    });
    await supabase.from("automation_runs").insert({
      rule_id: rule.id,
      card_event_id: record.id,
      status: error ? "failed" : "success",
      depth: depth + 1,
      result: { error: error?.message ?? null },
    });
    if (!error) processed++;
  }

  return new Response(JSON.stringify({ processed }), { headers: corsHeaders });
});
