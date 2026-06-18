import { createClient } from "@/lib/supabase/server";
import { buildIcsFeed } from "@/lib/ical";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_ical_feed_cards", { p_token: token });
  if (error || !data) {
    return new Response("Not found", { status: 404 });
  }

  const body = buildIcsFeed(
    (data as { id: string; title: string; due_date: string; board_name: string }[]).map((r) => ({
      id: r.id,
      title: r.title,
      due_date: r.due_date,
      board_name: r.board_name,
    })),
    "AVS Flow",
  );

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="nextgen-planner.ics"',
    },
  });
}
