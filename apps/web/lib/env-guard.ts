import "server-only";

/** Fragmentos proibidos em variaveis NEXT_PUBLIC_* (vazariam no bundle cliente). */
const FORBIDDEN_PUBLIC_FRAGMENTS = [
  "SECRET",
  "SERVICE_ROLE",
  "PRIVATE_KEY",
  "PRIVATE",
  "RESEND_",
  "TIFLUX_",
  "AZURE_CLIENT",
] as const;

/**
 * Falha o boot em producao se algum segredo estiver exposto via NEXT_PUBLIC_*.
 * Dev: apenas aviso no console.
 */
export function assertNoClientExposedSecrets(): void {
  const violations: string[] = [];

  for (const key of Object.keys(process.env)) {
    if (!key.startsWith("NEXT_PUBLIC_")) continue;
    const upper = key.toUpperCase();
    if (FORBIDDEN_PUBLIC_FRAGMENTS.some((frag) => upper.includes(frag))) {
      violations.push(key);
    }
  }

  if (!violations.length) return;

  const message = `[security] Segredo(s) com prefixo NEXT_PUBLIC_ detectado(s): ${violations.join(", ")}`;
  if (process.env.NODE_ENV === "production") {
    throw new Error(message);
  }
  console.warn(message);
}
