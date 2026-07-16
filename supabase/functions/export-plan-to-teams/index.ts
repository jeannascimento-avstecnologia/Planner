import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ExportBody = { orgId: string };

async function refreshMicrosoftToken(
  refreshToken: string,
): Promise<{ access: string; refresh: string; expiresAt: Date } | null> {
  const clientId = Deno.env.get("AZURE_CLIENT_ID");
  const clientSecret = Deno.env.get("AZURE_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: "Tasks.ReadWrite Group.Read.All User.Read offline_access",
  });

  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
  return {
    access: json.access_token,
    refresh: json.refresh_token ?? refreshToken,
    expiresAt: new Date(Date.now() + json.expires_in * 1000),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
    } = await supabaseUser.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as ExportBody;
    if (!body.orgId) throw new Error("orgId obrigatorio.");

    const { data: integration } = await supabaseUser
      .from("org_teams_integrations")
      .select("*")
      .eq("org_id", body.orgId)
      .maybeSingle();
    if (!integration) throw new Error("Integracao Teams nao configurada.");

    const { data: tokenRows, error: tokenErr } = await supabaseUser.rpc("get_user_microsoft_tokens");
    if (tokenErr || !tokenRows?.length) throw new Error("Conta Microsoft nao conectada.");

    let accessToken = tokenRows[0].access_token as string;
    let refreshToken = tokenRows[0].refresh_token as string;
    const expiresAt = new Date(tokenRows[0].expires_at as string);

    if (expiresAt.getTime() < Date.now() + 60_000) {
      const refreshed = await refreshMicrosoftToken(refreshToken);
      if (!refreshed) throw new Error("Falha ao renovar token Microsoft.");
      accessToken = refreshed.access;
      refreshToken = refreshed.refresh;
      await supabaseUser.rpc("set_user_microsoft_tokens", {
        p_access: accessToken,
        p_refresh: refreshToken,
        p_expires_at: refreshed.expiresAt.toISOString(),
      });
    }

    const { data: cards } = await supabaseUser
      .from("cards")
      .select("id, title, start_date, target_date, due_date, assignee_id")
      .eq("org_id", body.orgId)
      .eq("assignee_id", user.id)
      .is("completed_at", null);

    let exported = 0;

    for (const card of cards ?? []) {
      const { data: mapping } = await supabaseUser
        .from("teams_export_mappings")
        .select("planner_task_id")
        .eq("org_id", body.orgId)
        .eq("card_id", card.id)
        .maybeSingle();

      const start = card.start_date ?? card.target_date ?? new Date().toISOISOString();
      const due = card.target_date ?? card.due_date ?? start;

      const payload = {
        planId: integration.planner_plan_id,
        bucketId: integration.planner_bucket_id,
        title: card.title,
        startDateTime: start,
        dueDateTime: due,
      };

      let taskId = mapping?.planner_task_id as string | undefined;

      if (taskId) {
        const patchRes = await fetch(`https://graph.microsoft.com/v1.0/planner/tasks/${taskId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title: payload.title, dueDateTime: payload.dueDateTime }),
        });
        if (patchRes.ok) exported += 1;
      } else {
        const createRes = await fetch("https://graph.microsoft.com/v1.0/planner/tasks", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        if (createRes.ok) {
          const created = (await createRes.json()) as { id: string };
          taskId = created.id;
          await supabaseUser.rpc("upsert_teams_export_mapping", {
            p_org: body.orgId,
            p_card_id: card.id,
            p_planner_task_id: taskId,
          });
          exported += 1;
        }
      }
    }

    return new Response(JSON.stringify({ exported }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro desconhecido.";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
