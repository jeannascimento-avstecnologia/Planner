import { createClient } from "@/lib/supabase/server";
import { getConfiguredAppUrl } from "@/lib/app-url";
import { safeInternalPath } from "@/lib/safe-internal-path";
import { isLocalSupabaseUrl, MICROSOFT_LOGIN_LOCAL_MESSAGE } from "@/lib/supabase/is-local-url";

export type OAuthLoginProvider = "google" | "azure";

function authConfigError(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon || anon.includes("<")) {
    if (process.env.NODE_ENV === "development") {
      return "Supabase nao configurado. Rode `npm run dev:local` na raiz do projeto.";
    }
    return "Servico de autenticacao indisponivel.";
  }
  return null;
}

export async function getOAuthLoginRedirectUrl(
  provider: OAuthLoginProvider,
  nextRaw: string | null | undefined,
): Promise<{ url: string } | { error: string }> {
  const configError = authConfigError();
  if (configError) return { error: configError };

  if (provider === "azure" && isLocalSupabaseUrl()) {
    return { error: MICROSOFT_LOGIN_LOCAL_MESSAGE };
  }

  const next = safeInternalPath(nextRaw ?? null);
  const supabase = await createClient();
  const appUrl = getConfiguredAppUrl();
  const redirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent(next)}`;

  // #region agent log
  console.info(
    JSON.stringify({
      sessionId: "c84914",
      runId: "pre-fix",
      hypothesisId: "B,C",
      location: "auth-oauth-start.ts:getOAuthLoginRedirectUrl",
      message: "oauth start",
      data: { provider, redirectToHost: new URL(redirectTo).host },
      timestamp: Date.now(),
    }),
  );
  // #endregion

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options:
      provider === "google"
        ? {
            redirectTo,
            queryParams: { access_type: "offline", prompt: "consent" },
          }
        : {
            redirectTo,
            scopes: "email openid profile",
            queryParams: { prompt: "select_account" },
          },
  });

  if (error || !data.url) {
    // #region agent log
    console.error(
      JSON.stringify({
        sessionId: "c84914",
        runId: "pre-fix",
        hypothesisId: "C",
        location: "auth-oauth-start.ts:signInWithOAuth",
        message: "oauth signIn failed",
        data: { provider, errorMessage: error?.message ?? null, hasUrl: Boolean(data.url) },
        timestamp: Date.now(),
      }),
    );
    // #endregion
    return { error: "callback" };
  }
  return { url: data.url };
}
