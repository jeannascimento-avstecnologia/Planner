import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const body = (await req.json()) as { orgId?: string };
  if (!body.orgId) {
    return new Response(JSON.stringify({ error: "orgId required" }), { status: 400, headers: corsHeaders });
  }

  const supabaseUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const {
    data: { user },
  } = await supabaseUser.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const { data: orgConfig } = await supabaseUser
    .from("org_google_integrations")
    .select("calendar_id")
    .eq("org_id", body.orgId)
    .maybeSingle();
  if (!orgConfig?.calendar_id) {
    return new Response(JSON.stringify({ error: "google_not_configured" }), { status: 400, headers: corsHeaders });
  }

  const { data: tokens } = await supabaseUser.rpc("get_user_google_tokens");
  const accessToken = tokens?.[0]?.access_token as string | undefined;
  if (!accessToken) {
    return new Response(JSON.stringify({ error: "google_not_connected" }), { status: 400, headers: corsHeaders });
  }

  const { data: cards } = await supabaseUser
    .from("cards")
    .select("id, title, due_date, board_id")
    .eq("org_id", body.orgId)
    .not("due_date", "is", null)
    .is("completed_at", null);

  let exported = 0;
  for (const card of cards ?? []) {
    const { data: mapping } = await supabaseAdmin
      .from("google_export_mappings")
      .select("google_event_id")
      .eq("card_id", card.id)
      .maybeSingle();

    const eventBody = {
      summary: card.title,
      start: { date: (card.due_date as string).slice(0, 10) },
      end: { date: (card.due_date as string).slice(0, 10) },
    };

    const calendarId = encodeURIComponent(orgConfig.calendar_id);
    const url = mapping?.google_event_id
      ? `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${encodeURIComponent(mapping.google_event_id)}`
      : `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;

    const res = await fetch(url, {
      method: mapping?.google_event_id ? "PATCH" : "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventBody),
    });
    if (!res.ok) continue;

    const json = (await res.json()) as { id?: string };
    if (!json.id) continue;

    await supabaseAdmin.from("google_export_mappings").upsert({
      card_id: card.id,
      org_id: body.orgId,
      google_event_id: json.id,
      updated_at: new Date().toISOString(),
    });
    exported++;
  }

  return new Response(JSON.stringify({ exported }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
