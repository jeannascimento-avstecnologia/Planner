const INVITE_RATE_LIMIT_MAX = 20;
const INVITE_RATE_LIMIT_WINDOW_SEC = 3600;

type RateLimitResult = { allowed: true } | { allowed: false };

async function upstashGet(key: string): Promise<number> {
  const encoded = encodeURIComponent(key);
  const data = await upstashCommand(`/get/${encoded}`);
  if (!data || data.result === null || data.result === undefined) return 0;
  const n = Number(data.result);
  return Number.isFinite(n) ? n : 0;
}

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

/** Limite: 20 convites/hora por usuario (quando Upstash configurado). */
export async function checkInviteBatchRateLimit(
  userId: string,
  inviteCount: number,
): Promise<RateLimitResult> {
  if (inviteCount <= 0) return { allowed: true };

  const key = `ratelimit:${userId}:invite_batch`;
  const encoded = encodeURIComponent(key);

  const current = await upstashGet(key);
  if (current + inviteCount > INVITE_RATE_LIMIT_MAX) {
    return { allowed: false };
  }

  const incrBy = await upstashCommand(`/incrby/${encoded}/${inviteCount}`);
  if (!incrBy || typeof incrBy.result !== "number") {
    return { allowed: true };
  }

  if (incrBy.result === inviteCount) {
    await upstashCommand(`/expire/${encoded}/${INVITE_RATE_LIMIT_WINDOW_SEC}`);
  }

  return { allowed: true };
}
