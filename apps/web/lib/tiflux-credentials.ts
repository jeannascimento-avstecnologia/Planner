import "server-only";

import { tryCreateServiceClient } from "@/lib/supabase/service";

export type BoardTifluxCredentials = {
  token: string;
  apiUrl: string;
};

export type ResolveBoardTifluxResult =
  | { ok: true; creds: BoardTifluxCredentials; source: "board" | "legacy_env" }
  | { ok: false; code: "service_unavailable" | "not_configured" | "rpc_error"; message: string };

const DEFAULT_API_URL = "https://api.tiflux.com/api/v2";

export const TIFLUX_SERVICE_UNAVAILABLE_MSG =
  "Integracao Tiflux indisponivel no servidor. Configure SUPABASE_SERVICE_ROLE_KEY.";

export const TIFLUX_NOT_CONFIGURED_MSG = "Integracao Tiflux nao configurada neste projeto.";

/** Legacy global token — never in production (P0). Opt-in only for local/dev. */
export function isLegacyTifluxEnvAllowed(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  return nodeEnv !== "production";
}

function legacyEnvCredentials(): BoardTifluxCredentials | null {
  if (!isLegacyTifluxEnvAllowed()) return null;
  const legacy = process.env.TIFLUX_API_TOKEN;
  if (!legacy) return null;
  return {
    token: legacy,
    apiUrl: (process.env.TIFLUX_API_URL ?? DEFAULT_API_URL).replace(/\/$/, ""),
  };
}

export async function resolveBoardTifluxTokenDetailed(boardId: string): Promise<ResolveBoardTifluxResult> {
  const service = tryCreateServiceClient();
  if (!service) {
    const legacy = legacyEnvCredentials();
    if (legacy) {
      return { ok: true, creds: legacy, source: "legacy_env" };
    }
    return { ok: false, code: "service_unavailable", message: TIFLUX_SERVICE_UNAVAILABLE_MSG };
  }

  const { data, error } = await service.rpc("get_board_tiflux_token", { p_board: boardId });
  if (error) {
    return {
      ok: false,
      code: "rpc_error",
      message: "Nao foi possivel ler a credencial Tiflux do projeto.",
    };
  }

  if (!data?.length || !data[0]?.token) {
    const legacy = legacyEnvCredentials();
    if (legacy) return { ok: true, creds: legacy, source: "legacy_env" };
    return { ok: false, code: "not_configured", message: TIFLUX_NOT_CONFIGURED_MSG };
  }

  const row = data[0];
  return {
    ok: true,
    creds: {
      token: row.token,
      apiUrl: (row.api_url ?? DEFAULT_API_URL).replace(/\/$/, ""),
    },
    source: "board",
  };
}

export async function resolveBoardTifluxToken(boardId: string): Promise<BoardTifluxCredentials | null> {
  const result = await resolveBoardTifluxTokenDetailed(boardId);
  return result.ok ? result.creds : null;
}

export async function getBoardTifluxConfigured(boardId: string): Promise<boolean> {
  const service = tryCreateServiceClient();
  if (!service) return false;
  const { data, error } = await service.rpc("board_tiflux_status", { p_board: boardId });
  if (error) return false;
  return Boolean(data);
}
