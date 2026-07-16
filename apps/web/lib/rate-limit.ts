/**
 * Rate limit via Upstash Redis (multi-instance).
 *
 * Keys: `ratelimit:{scope}:{id}:{action}` — TTL = janela.
 * Fail-open: se Upstash ausente/indisponível, permite (evita lockout total).
 * Invite batch: ver `invite-rate-limit.ts` (mesmo backend).
 */

import type { NextRequest } from "next/server";

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

type UpstashResult = { result?: number | string | null };

function upstashConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function upstashCommand(path: string): Promise<UpstashResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const res = await fetch(`${url}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as UpstashResult;
  } catch {
    return null;
  }
}

/** Normaliza para `ratelimit:…` hierárquico. */
export function rateLimitKey(parts: string[]): string {
  const cleaned = parts.map((p) => p.trim()).filter(Boolean);
  if (cleaned[0] === "ratelimit") return cleaned.join(":");
  return ["ratelimit", ...cleaned].join(":");
}

/**
 * Sliding fixed-window via INCR + EXPIRE.
 * @param keyParts segmentos após `ratelimit:` (ex: `["ip", ip, "http"]`)
 */
export async function checkRateLimit(
  keyParts: string[] | string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const key = typeof keyParts === "string" ? rateLimitKey([keyParts]) : rateLimitKey(keyParts);
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const encoded = encodeURIComponent(key);

  if (!upstashConfigured()) {
    return { ok: true };
  }

  const incr = await upstashCommand(`/incr/${encoded}`);
  if (!incr || typeof incr.result !== "number") {
    return { ok: true };
  }

  if (incr.result === 1) {
    await upstashCommand(`/expire/${encoded}/${windowSec}`);
  }

  if (incr.result > limit) {
    const ttlRes = await upstashCommand(`/ttl/${encoded}`);
    const ttl = typeof ttlRes?.result === "number" ? ttlRes.result : -1;
    const retryAfterSec = ttl > 0 ? ttl : windowSec;
    return { ok: false, retryAfterSec };
  }

  return { ok: true };
}

export async function rateLimitAction(
  userId: string,
  action: string,
  limit = 30,
  windowMs = 60_000,
): Promise<RateLimitResult> {
  return checkRateLimit(["user", userId, action], limit, windowMs);
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}
