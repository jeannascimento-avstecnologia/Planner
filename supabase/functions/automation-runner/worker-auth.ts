/** Worker auth for automation-runner — CRON_SECRET or service role only. */

export type WorkerAuthResult =
  | { ok: true; via: "cron_secret" | "service_role" }
  | { ok: false; status: 401; error: string };

function bearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match?.[1]?.trim() || null;
}

/** Constant-time compare para secrets (mitiga timing side-channel). */
function timingSafeEqualString(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) {
    diff |= aBytes[i]! ^ bBytes[i]!;
  }
  return diff === 0;
}

/**
 * Accepts CRON_SECRET (Authorization Bearer or x-cron-secret) or SUPABASE_SERVICE_ROLE_KEY.
 * Rejects missing auth, anon, and normal user JWTs.
 */
export function assertWorkerAuth(
  req: Request,
  env: {
    cronSecret?: string | null;
    serviceRoleKey?: string | null;
  } = {
    cronSecret: Deno.env.get("CRON_SECRET"),
    serviceRoleKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  },
): WorkerAuthResult {
  const cronSecret = env.cronSecret?.trim() || null;
  const serviceRoleKey = env.serviceRoleKey?.trim() || null;
  const bearer = bearerToken(req.headers.get("Authorization"));
  const cronHeader = req.headers.get("x-cron-secret")?.trim() || null;

  if (cronSecret) {
    if (bearer && timingSafeEqualString(bearer, cronSecret)) {
      return { ok: true, via: "cron_secret" };
    }
    if (cronHeader && timingSafeEqualString(cronHeader, cronSecret)) {
      return { ok: true, via: "cron_secret" };
    }
  }

  if (serviceRoleKey && bearer && timingSafeEqualString(bearer, serviceRoleKey)) {
    return { ok: true, via: "service_role" };
  }

  return { ok: false, status: 401, error: "unauthorized" };
}
