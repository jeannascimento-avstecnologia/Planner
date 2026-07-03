import type { BoardTifluxDefaults } from "@nextgen/contracts";

export type BoardIntegrations = {
  tiflux?: BoardTifluxDefaults;
};

export function parseBoardIntegrations(raw: unknown): BoardIntegrations {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const tifluxRaw = obj.tiflux;
  if (!tifluxRaw || typeof tifluxRaw !== "object") return {};
  const t = tifluxRaw as Record<string, unknown>;
  return {
    tiflux: {
      clientName: typeof t.clientName === "string" ? t.clientName : undefined,
      deskName: typeof t.deskName === "string" ? t.deskName : undefined,
      responsibleName: typeof t.responsibleName === "string" ? t.responsibleName : undefined,
      requestorName: typeof t.requestorName === "string" ? t.requestorName : undefined,
      requestorEmail: typeof t.requestorEmail === "string" ? t.requestorEmail : undefined,
      configured: t.configured === true,
    },
  };
}

export function mergeTifluxDefaults(
  integrations: BoardIntegrations,
  defaults: BoardTifluxDefaults,
): BoardIntegrations {
  return { ...integrations, tiflux: { ...integrations.tiflux, ...defaults } };
}

export function isTifluxConfigured(integrations: unknown): boolean {
  return parseBoardIntegrations(integrations).tiflux?.configured === true;
}
