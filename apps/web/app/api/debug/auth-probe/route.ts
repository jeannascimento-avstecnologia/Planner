import { NextResponse } from "next/server";

function anonKind(key: string): string {
  if (!key) return "missing";
  if (key.includes("blYTn_I0")) return "local_demo";
  if (key.startsWith("sb_publishable_")) return "publishable";
  if (key.startsWith("eyJ")) return "jwt_legacy";
  if (key.startsWith("sb_secret_")) return "secret_wrong";
  return "unknown";
}

/** GET /api/debug/auth-probe — diagnostico de env (sem segredos). */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  let urlHost: string | null = null;
  try {
    urlHost = url ? new URL(url).host : null;
  } catch {
    urlHost = "invalid";
  }

  return NextResponse.json(
    {
      sessionId: "fa60ca",
      hasUrl: Boolean(url),
      hasAnon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()),
      urlHost,
      anonKind: anonKind(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""),
      appUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
      nodeEnv: process.env.NODE_ENV ?? null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** POST /api/debug/auth-probe — confirma que POST chega ao Next.js. */
export async function POST() {
  return NextResponse.json(
    { sessionId: "fa60ca", ok: true, message: "post_reached_nextjs" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
