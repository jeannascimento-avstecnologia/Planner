import { NextResponse } from "next/server";
import { sendDueDateNotifications } from "@/lib/email/notify-events";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sent = await sendDueDateNotifications();
  return NextResponse.json({ ok: true, sent });
}
