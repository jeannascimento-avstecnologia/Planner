import "server-only";

import { createServiceClient } from "@/lib/supabase/service";

export type BoardTifluxCredentials = {
  token: string;
  apiUrl: string;
};

const DEFAULT_API_URL = "https://api.tiflux.com/api/v2";

export async function resolveBoardTifluxToken(boardId: string): Promise<BoardTifluxCredentials | null> {
  const service = createServiceClient();
  const { data, error } = await service.rpc("get_board_tiflux_token", { p_board: boardId });
  if (error || !data?.length) {
    const legacy = process.env.TIFLUX_API_TOKEN;
    if (legacy) {
      return {
        token: legacy,
        apiUrl: (process.env.TIFLUX_API_URL ?? DEFAULT_API_URL).replace(/\/$/, ""),
      };
    }
    return null;
  }
  const row = data[0];
  if (!row?.token) return null;
  return {
    token: row.token,
    apiUrl: (row.api_url ?? DEFAULT_API_URL).replace(/\/$/, ""),
  };
}

export async function getBoardTifluxConfigured(boardId: string): Promise<boolean> {
  const service = createServiceClient();
  const { data, error } = await service.rpc("board_tiflux_status", { p_board: boardId });
  if (error) return false;
  return Boolean(data);
}
