import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SignBody = {
  folder?: string;
  orgId?: string;
};

async function sha1Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET");
  const apiKey = Deno.env.get("CLOUDINARY_API_KEY");
  const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME") ?? Deno.env.get("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME");

  if (!apiSecret || !apiKey || !cloudName) {
    return new Response(JSON.stringify({ error: "cloudinary_not_configured" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
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

  let body: SignBody = {};
  try {
    body = (await req.json()) as SignBody;
  } catch {
    body = {};
  }

  let folder = body.folder?.trim() || "uploads";
  if (body.orgId) {
    const { data: membership } = await supabase
      .from("memberships")
      .select("role")
      .eq("org_id", body.orgId)
      .eq("user_id", user.id)
      .maybeSingle();
    const role = membership?.role;
    if (!role || (role !== "admin" && role !== "owner")) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    folder = `org-logos/${body.orgId}`;
  }

  const timestamp = Math.round(Date.now() / 1000);
  const params = { folder, timestamp };
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k as keyof typeof params]}`)
    .join("&");
  const signature = await sha1Hex(sorted + apiSecret);

  return new Response(
    JSON.stringify({ signature, timestamp, apiKey, folder, cloudName }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
