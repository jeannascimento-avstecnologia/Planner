import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

/** Backoff em minutos: min(60, 2^attempts) — espelha automation-runner */
export function outboxBackoffMinutes(attempts: number): number {
  return Math.min(60, 2 ** attempts);
}

Deno.test("outbox backoff caps at 60 minutes", () => {
  assertEquals(outboxBackoffMinutes(1), 2);
  assertEquals(outboxBackoffMinutes(5), 32);
  assertEquals(outboxBackoffMinutes(10), 60);
});

Deno.test("webhook HMAC header shape", async () => {
  const secret = "test-secret";
  const body = JSON.stringify({ card_id: "abc" });
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  assertEquals(hex.length, 64);
});
