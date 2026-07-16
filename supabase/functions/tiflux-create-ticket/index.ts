import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type TicketBody = {
  cardId: string;
  boardId: string;
  title: string;
  description: string;
  observation?: string;
  clientName: string;
  deskName: string;
  responsibleName?: string;
  requestorName: string;
  requestorEmail?: string;
  requestorTelephone?: string;
};

/** Board token only — no global TIFLUX_API_TOKEN fallback (P0). */
async function resolveBoardTifluxToken(
  service: ReturnType<typeof createClient>,
  boardId: string,
): Promise<{ token: string; baseUrl: string } | null> {
  const { data, error } = await service.rpc("get_board_tiflux_token", { p_board: boardId });
  if (error || !data?.length || !data[0]?.token) return null;
  return {
    token: data[0].token as string,
    baseUrl: ((data[0].api_url as string | null) ?? "https://api.tiflux.com/api/v2").replace(
      /\/$/,
      "",
    ),
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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as TicketBody;
    const { data: board } = await supabase
      .from("boards")
      .select("tiflux_enabled, org_id")
      .eq("id", body.boardId)
      .single();
    if (!board?.tiflux_enabled) throw new Error("Projeto sem Tiflux.");

    const { data: membership } = await supabase
      .from("memberships")
      .select("role")
      .eq("org_id", board.org_id)
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: boardMember } = await supabase
      .from("board_members")
      .select("role")
      .eq("board_id", body.boardId)
      .eq("user_id", user.id)
      .maybeSingle();

    const isOrgAdmin = membership?.role === "admin" || membership?.role === "owner";
    const canWrite = isOrgAdmin || boardMember?.role === "admin";
    if (!canWrite) throw new Error("Sem permissao para usar a integracao Tiflux neste projeto.");

    const { data: ownedCard } = await supabase
      .from("cards")
      .select("id")
      .eq("id", body.cardId)
      .eq("board_id", body.boardId)
      .single();
    if (!ownedCard) throw new Error("Card nao encontrado.");

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const creds = await resolveBoardTifluxToken(service, body.boardId);
    if (!creds) throw new Error("Integracao Tiflux nao configurada neste projeto.");

    const res = await fetch(`${creds.baseUrl}/tickets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: body.title,
        description: body.description,
        observation: body.observation,
        client_name: body.clientName,
        desk_name: body.deskName,
        responsible_name: body.responsibleName,
        requestor_name: body.requestorName,
        requestor_email: body.requestorEmail,
        requestor_telephone: body.requestorTelephone,
      }),
    });

    const apiBody = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        typeof apiBody === "object" && apiBody && "message" in apiBody
          ? String((apiBody as { message: unknown }).message)
          : `Tiflux HTTP ${res.status}`;
      throw new Error(msg);
    }

    const nested =
      apiBody && typeof apiBody === "object" && "ticket" in apiBody
        ? (apiBody as { ticket: Record<string, unknown> }).ticket
        : (apiBody as Record<string, unknown>);
    const ticketId = String(nested.id ?? nested.ticket_id ?? "");
    const ticketNumber = String(nested.number ?? nested.ticket_number ?? ticketId);

    await service
      .from("cards")
      .update({
        tiflux_ticket_id: ticketId || ticketNumber,
        tiflux_ticket_number: ticketNumber,
        tiflux_payload: apiBody,
        tiflux_created_at: new Date().toISOString(),
      })
      .eq("id", body.cardId)
      .eq("board_id", body.boardId);

    return new Response(JSON.stringify({ ticketId, ticketNumber }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro interno";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
