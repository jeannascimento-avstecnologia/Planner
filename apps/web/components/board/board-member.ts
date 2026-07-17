import type { ProfileRow } from "./types";

export type BoardMember = {
  user_id: string;
  role: string;
  /** Preset atribuído (null/undefined = legado só por role). */
  preset_id?: string | null;
  /** Nome resolvido via catálogo (1× listAccessPresets / map id→name). */
  presetName?: string;
  profile?: ProfileRow;
};
