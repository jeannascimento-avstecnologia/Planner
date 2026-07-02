import { NextRequest, NextResponse } from "next/server";

const BUCKET = "org-logos";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILE_RE = /^[\w-]+\.(jpg|jpeg|png|webp|gif)$/i;
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function isValidStoragePath(storagePath: string): boolean {
  const parts = storagePath.split("/");
  if (parts.length !== 2) return false;
  const [orgId, fileName] = parts;
  if (!orgId || !fileName || orgId.includes("..") || fileName.includes("..")) return false;
  return UUID_RE.test(orgId) && FILE_RE.test(fileName);
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  if (!path?.length || path.length > 2) return new NextResponse(null, { status: 400 });

  const storagePath = path.map((segment) => decodeURIComponent(segment)).join("/");
  if (!isValidStoragePath(storagePath)) return new NextResponse(null, { status: 400 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!supabaseUrl) return new NextResponse(null, { status: 503 });

  let upstream: URL;
  try {
    upstream = new URL(`${supabaseUrl}/storage/v1/object/public/${BUCKET}/${storagePath}`);
    if (upstream.origin !== new URL(supabaseUrl).origin) {
      return new NextResponse(null, { status: 400 });
    }
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const res = await fetch(upstream);
  if (!res.ok) return new NextResponse(null, { status: res.status });

  const rawContentType = res.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
  const contentType = ALLOWED_CONTENT_TYPES.has(rawContentType) ? rawContentType : "application/octet-stream";
  if (contentType === "application/octet-stream") {
    return new NextResponse(null, { status: 415 });
  }

  const buffer = await res.arrayBuffer();
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
