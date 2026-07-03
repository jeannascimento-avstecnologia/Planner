/** Locks de submit que sobrevivem remount de componente (revalidate RSC). */
const locks = new Set<string>();

export function acquireInFlightLock(key: string): boolean {
  if (locks.has(key)) return false;
  locks.add(key);
  return true;
}

export function releaseInFlightLock(key: string): void {
  locks.delete(key);
}
