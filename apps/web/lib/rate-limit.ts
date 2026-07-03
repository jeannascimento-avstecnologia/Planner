/** Rate limit in-memory (por instancia serverless). Para prod multi-node, usar Redis/Upstash. */

import type { NextRequest } from "next/server";

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();
const PURGE_INTERVAL_MS = 60_000;
let lastPurge = Date.now();

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

function purgeExpired(now: number): void {
  if (now - lastPurge < PURGE_INTERVAL_MS) return;
  lastPurge = now;
  for (const [key, bucket] of store) {
    if (now >= bucket.resetAt) store.delete(key);
  }
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  purgeExpired(now);
  const bucket = store.get(key);

  if (!bucket || now >= bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { ok: true };
}

export function rateLimitAction(userId: string, action: string, limit = 30, windowMs = 60_000): RateLimitResult {
  return checkRateLimit(`${action}:${userId}`, limit, windowMs);
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}
