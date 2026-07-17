import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { outboxBackoffMinutes } from "./outbox-backoff.ts";
import { assertWorkerAuth } from "./worker-auth.ts";
import {
  assertSafeWebhookUrl,
  assertSafeWebhookUrlResolved,
  type ResolveDnsFn,
} from "./webhook-ssrf.ts";

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

Deno.test("worker auth rejects missing credentials", () => {
  const req = new Request("https://example.com/functions/v1/automation-runner", { method: "POST" });
  const result = assertWorkerAuth(req, {
    cronSecret: "cron-secret-value",
    serviceRoleKey: "service-role-key",
  });
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.status, 401);
});

Deno.test("worker auth rejects user-like JWT bearer", () => {
  const req = new Request("https://example.com/functions/v1/automation-runner", {
    method: "POST",
    headers: { Authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.user-jwt.signature" },
  });
  const result = assertWorkerAuth(req, {
    cronSecret: "cron-secret-value",
    serviceRoleKey: "service-role-key",
  });
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.status, 401);
});

Deno.test("worker auth accepts CRON_SECRET bearer", () => {
  const req = new Request("https://example.com/functions/v1/automation-runner", {
    method: "POST",
    headers: { Authorization: "Bearer cron-secret-value" },
  });
  const result = assertWorkerAuth(req, {
    cronSecret: "cron-secret-value",
    serviceRoleKey: "service-role-key",
  });
  assertEquals(result, { ok: true, via: "cron_secret" });
});

Deno.test("worker auth accepts x-cron-secret header", () => {
  const req = new Request("https://example.com/functions/v1/automation-runner", {
    method: "POST",
    headers: { "x-cron-secret": "cron-secret-value" },
  });
  const result = assertWorkerAuth(req, {
    cronSecret: "cron-secret-value",
    serviceRoleKey: "service-role-key",
  });
  assertEquals(result, { ok: true, via: "cron_secret" });
});

Deno.test("worker auth accepts service role key", () => {
  const req = new Request("https://example.com/functions/v1/automation-runner", {
    method: "POST",
    headers: { Authorization: "Bearer service-role-key" },
  });
  const result = assertWorkerAuth(req, {
    cronSecret: "cron-secret-value",
    serviceRoleKey: "service-role-key",
  });
  assertEquals(result, { ok: true, via: "service_role" });
});

Deno.test("SSRF blocks private and metadata URLs", () => {
  const blocked = [
    "http://example.com/hook",
    "https://127.0.0.1/hook",
    "https://localhost/hook",
    "https://10.0.0.5/hook",
    "https://192.168.1.1/hook",
    "https://169.254.169.254/latest/meta-data",
    "https://metadata.google.internal/",
    "https://[::1]/",
    "https://2130706433/hook", // decimal 127.0.0.1
  ];
  for (const url of blocked) {
    const result = assertSafeWebhookUrl(url);
    assertEquals(result.ok, false, url);
  }
});

Deno.test("SSRF allows public https (sync syntactic)", () => {
  const result = assertSafeWebhookUrl("https://hooks.slack.com/services/T/B/X");
  assertEquals(result.ok, true);
});

function mockResolve(map: Record<string, { A?: string[]; AAAA?: string[] }>): ResolveDnsFn {
  return async (hostname, recordType) => map[hostname]?.[recordType] ?? [];
}

Deno.test("SSRF DNS blocks hostname resolving to private IP", async () => {
  const resolve = mockResolve({
    "evil.example": { A: ["169.254.169.254"] },
  });
  const result = await assertSafeWebhookUrlResolved("https://evil.example/hook", resolve);
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.reason, "webhook_ssrf_blocked:dns_private");
});

Deno.test("SSRF DNS blocks empty resolution", async () => {
  const resolve = mockResolve({});
  const result = await assertSafeWebhookUrlResolved("https://missing.example/hook", resolve);
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.reason, "webhook_ssrf_blocked:dns_empty");
});

Deno.test("SSRF DNS blocks rebind on second resolve", async () => {
  let calls = 0;
  const resolve: ResolveDnsFn = async (_hostname, recordType) => {
    if (recordType !== "A") return [];
    calls += 1;
    // First pair of resolves (A+AAAA) sees public; recheck sees private.
    if (calls <= 1) return ["93.184.216.34"];
    return ["127.0.0.1"];
  };
  const result = await assertSafeWebhookUrlResolved("https://rebind.example/hook", resolve);
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.reason, "webhook_ssrf_blocked:dns_rebind");
});

Deno.test("SSRF DNS allows public A records", async () => {
  const resolve = mockResolve({
    "hooks.slack.com": { A: ["3.33.252.1"] },
  });
  const result = await assertSafeWebhookUrlResolved(
    "https://hooks.slack.com/services/T/B/X",
    resolve,
  );
  assertEquals(result.ok, true);
});
