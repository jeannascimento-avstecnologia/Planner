import { NextRequest, NextResponse } from "next/server";

const BUCKET = "org-logos";
const PATH_RE = /^[\w-]+\/[\w-]+\.(jpg|jpeg|png|webp|gif)$/i;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  if (!path?.length) return new NextResponse(null, { status: 400 });

  const storagePath = path.map((segment) => decodeURIComponent(segment)).join("/");
  if (!PATH_RE.test(storagePath)) return new NextResponse(null, { status: 400 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!supabaseUrl) return new NextResponse(null, { status: 503 });

  const upstream = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${storagePath}`;
  const res = await fetch(upstream);
  if (!res.ok) return new NextResponse(null, { status: res.status });

  const contentType = res.headers.get("content-type") ?? "application/octet-stream";
  const buffer = await res.arrayBuffer();
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
