import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@nextgen/contracts";
import { sessionOnlyCookieMethods } from "@/lib/supabase/browser-auth-cookies";

export function createClient(options?: { sessionOnly?: boolean; isSingleton?: boolean }) {
  const singletonOpt =
    options?.isSingleton !== undefined ? { isSingleton: options.isSingleton } : undefined;

  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    options?.sessionOnly
      ? {
          isSingleton: options.isSingleton ?? false,
          cookies: sessionOnlyCookieMethods(),
        }
      : singletonOpt,
  );
}
