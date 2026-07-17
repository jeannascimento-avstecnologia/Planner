/** SSRF guard for automation webhook / Slack URLs. HTTPS only; block private targets + DNS rebind. */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.goog",
  "kubernetes.default",
  "kubernetes.default.svc",
]);

function parseIpv4(host: string): number[] | null {
  const parts = host.split(".");
  if (parts.length !== 4) return null;
  const nums: number[] = [];
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const n = Number(p);
    if (n < 0 || n > 255) return null;
    nums.push(n);
  }
  return nums;
}

function isPrivateOrReservedIpv4(octets: number[]): boolean {
  const [a, b] = octets;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  if (a === 192 && b === 0 && octets[2] === 0) return true;
  if (a === 192 && b === 0 && octets[2] === 2) return true; // TEST-NET
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true; // multicast / reserved
  return false;
}

/** Bloqueia host numérico decimal/octal estilo SSRF (ex: http://2130706433). */
function hostnameLooksLikeDecimalIp(host: string): boolean {
  if (!/^\d+$/.test(host)) return false;
  try {
    const n = BigInt(host);
    return n >= 0n && n <= 0xffffffffn;
  } catch {
    return false;
  }
}

function isPrivateOrReservedIpv6(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "::1" || h === "::") return true;
  if (h.startsWith("fc") || h.startsWith("fd")) return true; // ULA (approx)
  if (h.startsWith("fe80")) return true; // link-local
  if (h.startsWith("ff")) return true; // multicast
  // IPv4-mapped
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(h);
  if (mapped) {
    const octets = parseIpv4(mapped[1]);
    if (octets && isPrivateOrReservedIpv4(octets)) return true;
  }
  return false;
}

/** True if host string is a literal IP that must not be contacted. */
export function isBlockedIpLiteral(host: string): boolean {
  const normalized = host.replace(/^\[|\]$/g, "").toLowerCase();
  const ipv4 = parseIpv4(normalized);
  if (ipv4) return isPrivateOrReservedIpv4(ipv4);
  if (normalized.includes(":")) return isPrivateOrReservedIpv6(normalized);
  return false;
}

function hostnameBlocked(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host)) return true;
  if (host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return true;
  }
  if (hostnameLooksLikeDecimalIp(host)) return true;
  return isBlockedIpLiteral(host);
}

function isLiteralIpHostname(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "");
  if (parseIpv4(host)) return true;
  // crude IPv6 / bracket form already stripped
  return host.includes(":");
}

export type WebhookUrlCheck =
  | { ok: true; url: URL }
  | { ok: false; reason: string };

/**
 * Synchronous syntactic SSRF checks (scheme, userinfo, literal private hosts).
 * Does not resolve DNS — use `assertSafeWebhookUrlResolved` before fetch.
 */
export function assertSafeWebhookUrl(raw: string): WebhookUrlCheck {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: "webhook_ssrf_blocked:invalid_url" };
  }

  if (url.protocol !== "https:") {
    return { ok: false, reason: "webhook_ssrf_blocked:https_only" };
  }

  if (url.username || url.password) {
    return { ok: false, reason: "webhook_ssrf_blocked:userinfo" };
  }

  if (!url.hostname) {
    return { ok: false, reason: "webhook_ssrf_blocked:empty_host" };
  }

  if (hostnameBlocked(url.hostname)) {
    return { ok: false, reason: "webhook_ssrf_blocked:private_or_metadata" };
  }

  return { ok: true, url };
}

export type ResolveDnsFn = (
  hostname: string,
  recordType: "A" | "AAAA",
) => Promise<string[]>;

async function defaultResolveDns(
  hostname: string,
  recordType: "A" | "AAAA",
): Promise<string[]> {
  try {
    return await Deno.resolveDns(hostname, recordType);
  } catch {
    return [];
  }
}

/**
 * Full SSRF guard: syntactic checks + DNS A/AAAA resolution.
 * Rejects if any resolved address is private/reserved/metadata, or if name has no records.
 * Caller must keep `redirect: "error"` on fetch.
 */
export async function assertSafeWebhookUrlResolved(
  raw: string,
  resolveDns: ResolveDnsFn = defaultResolveDns,
): Promise<WebhookUrlCheck> {
  const base = assertSafeWebhookUrl(raw);
  if (!base.ok) return base;

  const hostname = base.url.hostname;
  if (isLiteralIpHostname(hostname)) {
    // Literal public IP already passed hostnameBlocked; nothing to resolve.
    return base;
  }

  const [aRecords, aaaaRecords] = await Promise.all([
    resolveDns(hostname, "A"),
    resolveDns(hostname, "AAAA"),
  ]);
  const addresses = [...aRecords, ...aaaaRecords];

  if (addresses.length === 0) {
    return { ok: false, reason: "webhook_ssrf_blocked:dns_empty" };
  }

  for (const addr of addresses) {
    if (isBlockedIpLiteral(addr)) {
      return { ok: false, reason: "webhook_ssrf_blocked:dns_private" };
    }
  }

  // Re-resolve immediately to shrink TOCTOU / rebinding window before caller fetch.
  const [a2, aaaa2] = await Promise.all([
    resolveDns(hostname, "A"),
    resolveDns(hostname, "AAAA"),
  ]);
  const recheck = [...a2, ...aaaa2];
  if (recheck.length === 0) {
    return { ok: false, reason: "webhook_ssrf_blocked:dns_empty" };
  }
  for (const addr of recheck) {
    if (isBlockedIpLiteral(addr)) {
      return { ok: false, reason: "webhook_ssrf_blocked:dns_rebind" };
    }
  }

  return base;
}
