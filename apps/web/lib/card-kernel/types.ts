import type {
  CreateCardInput,
  DeleteCardInput,
  MoveCardInput,
  UpdateCardFieldsInput,
  UpdateCardInput,
} from "@nextgen/contracts";

export type CardOk = { ok: true };
export type CardErr = { ok: false; error: string };
export type CardResult = CardOk | CardErr;

/** Compat com actions legadas que retornam `{ error }` sem `ok: false`. */
export type LegacyCardResult = { ok: true } | { error: string };
export type LegacyCardResultWith<T> = ({ ok: true } & T) | { error: string };

export type CreateCardResult = LegacyCardResultWith<{ cardId: string }>;
export type MoveCardResult = LegacyCardResult;
export type DeleteCardResult = LegacyCardResult;
export type UpdateCardFieldsResult = CardResult;
export type CreateChecklistItemResult = LegacyCardResultWith<{ itemId: string }>;

export type CardDeleteImpact = { subtasks: number; dependencies: number };

export type { CreateCardInput, DeleteCardInput, MoveCardInput, UpdateCardFieldsInput, UpdateCardInput };

export type CardDateFields = {
  start_date: string | null;
  due_date: string | null;
};

export type CardFieldsPatchRecord = Record<string, string | number | null>;
