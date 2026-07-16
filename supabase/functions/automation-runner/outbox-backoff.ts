/** Backoff em minutos: min(60, 2^attempts) — espelha automation-runner */
export function outboxBackoffMinutes(attempts: number): number {
  return Math.min(60, 2 ** attempts);
}
