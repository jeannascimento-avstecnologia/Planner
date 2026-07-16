import type { UpdateCardInput } from "@nextgen/contracts";
import { resolveCardDateRange } from "@/lib/parse-date-br";
import type { CardDateFields, CardFieldsPatchRecord } from "./types";

/**
 * Monta o patch canônico de update (drawer/Form) a partir do input tipado + estado atual.
 * Única fonte de verdade para mapeamento camelCase → colunas DB + resolução de datas.
 */
export function buildUpdateCardPatch(
  input: UpdateCardInput,
  existing: CardDateFields,
): CardFieldsPatchRecord {
  const nextStart = input.startDate !== undefined ? input.startDate : existing.start_date;
  const nextDue = input.dueDate !== undefined ? input.dueDate : existing.due_date;
  const resolved = resolveCardDateRange(nextStart, nextDue);
  const resolvedStart = resolved.start;

  const patch: CardFieldsPatchRecord = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.dueDate !== undefined) patch.due_date = input.dueDate;
  if (input.targetDate !== undefined) patch.target_date = input.targetDate;
  if (input.startDate !== undefined) {
    patch.start_date = input.startDate === null ? null : resolvedStart;
  } else if (input.dueDate !== undefined && resolvedStart !== existing.start_date) {
    patch.start_date = resolvedStart;
  }
  if (input.assigneeId !== undefined) patch.assignee_id = input.assigneeId;
  if (input.estimatedHours !== undefined) patch.estimated_hours = input.estimatedHours;

  return patch;
}
