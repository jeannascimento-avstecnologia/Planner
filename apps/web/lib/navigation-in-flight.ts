/** Guard global: evita navegacoes RSC duplicadas enquanto uma esta pendente. */
let inFlightPath: string | null = null;

export function setNavigationInFlight(path: string | null): void {
  inFlightPath = path;
}

export function isNavigationInFlight(path: string): boolean {
  return inFlightPath === path;
}

export function clearNavigationInFlight(): void {
  inFlightPath = null;
}
