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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const token = Deno.env.get("TIFLUX_API_TOKEN");
    const baseUrl = Deno.env.get("TIFLUX_API_URL") ?? "https://api.tiflux.com/api/v2";
    if (!token) throw new Error("TIFLUX_API_TOKEN ausente.");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Nao autenticado.");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const body = (await req.json()) as TicketBody;
    const { data: board } = await supabase
      .from("boards")
      .select("tiflux_enabled")
      .eq("id", body.boardId)
      .single();
    if (!board?.tiflux_enabled) throw new Error("Projeto sem Tiflux.");

    // Garante que o card pertence ao board acessivel (RLS) antes do update via service role.
    // Sem isso, um usuario autenticado poderia sobrescrever campos tiflux_* de cards de outro tenant.
    const { data: ownedCard } = await supabase
      .from("cards")
      .select("id")
      .eq("id", body.cardId)
      .eq("board_id", body.boardId)
      .single();
    if (!ownedCard) throw new Error("Card nao encontrado.");

    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/tickets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
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

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
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
