import { createServerClient } from "@supabase/ssr";
import type { Database } from "@nextgen/contracts";
import { createClient } from "@/lib/supabase/server";

export type CachedSupabaseClient = Awaited<ReturnType<typeof createClient>>;

/** Extrai access token FORA de unstable_cache (cookies() permitido aqui). */
export async function getAccessTokenForCache(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/** Cliente Supabase estatico (sem cookies) para callbacks de unstable_cache. */
export function createCachedSupabaseClient(accessToken: string): CachedSupabaseClient {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      cookies: { getAll: () => [], setAll: () => {} },
    },
  );
}
