import { acquireInFlightLock, releaseInFlightLock } from "@/lib/in-flight-submit";

export function planAllocationLockKey(cardId: string, workDate: string): string {
  return `plan:${cardId}:${workDate}`;
}

export function planScheduleLockKey(cardId: string): string {
  return `plan:schedule:${cardId}`;
}

export function planRemoveLockKey(cardId: string): string {
  return `plan:remove:${cardId}`;
}

export async function withInFlightLock<T>(key: string, fn: () => Promise<T>): Promise<T | null> {
  if (!acquireInFlightLock(key)) return null;
  try {
    return await fn();
  } finally {
    releaseInFlightLock(key);
  }
}
