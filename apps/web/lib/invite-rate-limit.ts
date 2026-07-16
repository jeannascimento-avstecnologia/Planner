const INVITE_RATE_LIMIT_MAX = 20;
const INVITE_RATE_LIMIT_WINDOW_SEC = 3600;

type RateLimitResult = { allowed: true } | { allowed: false };

async function upstashCommand(path: string): Promise<{ result?: number | string | null } | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const res = await fetch(`${url}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as { result?: number | string | null };
  } catch {
    return null;
  }
}

/**
 * Limite: 20 convites/hora por usuario.
 * Key: `ratelimit:user:{userId}:invite_batch` + TTL 3600s.
 * Fail-open se Upstash ausente/indisponível (mesmo contrato de `rate-limit.ts`).
 * Contagem via INCRBY-first (sem TOCTOU get+incr).
 */
export async function checkInviteBatchRateLimit(
  userId: string,
  inviteCount: number,
): Promise<RateLimitResult> {
  if (inviteCount <= 0) return { allowed: true };

  const key = `ratelimit:user:${userId}:invite_batch`;
  const encoded = encodeURIComponent(key);

  const incrBy = await upstashCommand(`/incrby/${encoded}/${inviteCount}`);
  if (!incrBy || typeof incrBy.result !== "number") {
    return { allowed: true };
  }

  if (incrBy.result === inviteCount) {
    await upstashCommand(`/expire/${encoded}/${INVITE_RATE_LIMIT_WINDOW_SEC}`);
  }

  if (incrBy.result > INVITE_RATE_LIMIT_MAX) {
    // Reverte incremento desta tentativa para nao "queimar" cota permanentemente.
    await upstashCommand(`/incrby/${encoded}/${-inviteCount}`);
    return { allowed: false };
  }

  return { allowed: true };
}
