import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, rateLimitAction, rateLimitKey } from "./rate-limit";

describe("rateLimitKey", () => {
  it("prefixes ratelimit hierarchy", () => {
    expect(rateLimitKey(["ip", "1.2.3.4", "http"])).toBe("ratelimit:ip:1.2.3.4:http");
    expect(rateLimitKey(["ratelimit", "user", "u1", "createBoard"])).toBe(
      "ratelimit:user:u1:createBoard",
    );
  });
});

describe("checkRateLimit Upstash", () => {
  const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = originalUrl;
    if (originalToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
  });

  it("fail-open when Upstash env missing", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const result = await checkRateLimit(["ip", "1.1.1.1", "http"], 1, 60_000);
    expect(result).toEqual({ ok: true });
  });

  it("allows under limit and sets TTL on first incr", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/incr/")) {
        return Response.json({ result: 1 });
      }
      if (url.includes("/expire/")) {
        return Response.json({ result: 1 });
      }
      return Response.json({ result: null });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await checkRateLimit(["user", "u1", "createBoard"], 20, 60_000);
    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalled();
    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes("/incr/"))).toBe(true);
    expect(urls.some((u) => u.includes("/expire/"))).toBe(true);
  });

  it("blocks when over limit and returns retryAfter", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/incr/")) return Response.json({ result: 21 });
      if (url.includes("/ttl/")) return Response.json({ result: 42 });
      return Response.json({ result: null });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await rateLimitAction("u1", "createBoard", 20, 60_000);
    expect(result).toEqual({ ok: false, retryAfterSec: 42 });
  });

  it("fail-open when Upstash HTTP fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("err", { status: 500 })));
    const result = await checkRateLimit(["ip", "9.9.9.9", "auth-sign-out"], 20, 60_000);
    expect(result).toEqual({ ok: true });
  });
});
