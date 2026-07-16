import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { outboxBackoffMinutes } from "./outbox-backoff.ts";
import { assertWorkerAuth } from "./worker-auth.ts";
import { assertSafeWebhookUrl } from "./webhook-ssrf.ts";

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

Deno.test("SSRF allows public https", () => {
  const result = assertSafeWebhookUrl("https://hooks.slack.com/services/T/B/X");
  assertEquals(result.ok, true);
});
