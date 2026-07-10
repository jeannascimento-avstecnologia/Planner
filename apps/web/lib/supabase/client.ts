import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@nextgen/contracts";
import { sessionOnlyCookieMethods } from "@/lib/supabase/browser-auth-cookies";

export function createClient(options?: { sessionOnly?: boolean }) {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    options?.sessionOnly
      ? {
          isSingleton: false,
          cookies: sessionOnlyCookieMethods(),
        }
      : undefined,
  );
}
