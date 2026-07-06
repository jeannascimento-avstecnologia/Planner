import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@nextgen/contracts";
import {
  applyAuthSessionCookieOptions,
  isSessionOnlyAuth,
} from "@/lib/supabase/auth-cookies";

export { AUTH_REMEMBER_MAX_AGE_SEC } from "@/lib/supabase/auth-cookies";

export type CreateClientOptions = {
  /** true = cookie de sessao (expira ao fechar o browser). */
  sessionCookies?: boolean;
};

export async function createClient(options?: CreateClientOptions) {
  const cookieStore = await cookies();
  const sessionOnly =
    options?.sessionCookies ?? isSessionOnlyAuth({ get: (name) => cookieStore.get(name) });

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options: cookieOpts }) => {
              cookieStore.set(name, value, applyAuthSessionCookieOptions(cookieOpts, sessionOnly));
            });
          } catch {
            // Chamado a partir de um Server Component (read-only).
            // O middleware (updateSession) cuida da renovacao do cookie.
          }
        },
      },
    },
  );
}