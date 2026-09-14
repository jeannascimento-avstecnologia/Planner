import { updateCardInput, type UpdateCardInput } from "@nextgen/contracts";
import { parseLocaleNumber } from "@/lib/parse-number";

function formDateOrNull(raw: FormDataEntryValue | null): string | null | undefined {
  if (raw === null) return undefined;
  if (raw === "") return null;
  return `${raw}T12:00:00.000Z`;
}

function formNumberOrNull(
  formData: FormData,
  key: string,
  integer: boolean,
  invalidMessage: string,
): { ok: true; value: number | null | undefined } | { ok: false; error: string } {
  if (!formData.has(key)) return { ok: true, value: undefined };
  const raw = String(formData.get(key) ?? "").trim();
  if (raw === "") return { ok: true, value: null };
  const n = parseLocaleNumber(raw);
  if (n === null) return { ok: false, error: invalidMessage };
  if (integer && !Number.isInteger(n)) return { ok: false, error: invalidMessage };
  return { ok: true, value: n };
}

export function parseUpdateCardFormData(formData: FormData):
  | { ok: true; data: UpdateCardInput }
  | { ok: false; error: string } {
  const assigneeRaw = formData.get("assigneeId");
  const hours = formNumberOrNull(formData, "estimatedHours", false, "Horas estimadas invalidas.");
  if (!hours.ok) return hours;
  const points = formNumberOrNull(formData, "storyPoints", true, "Pontos invalidos.");
  if (!points.ok) return points;

  const parsed = updateCardInput.safeParse({
    cardId: formData.get("cardId"),
    boardId: formData.get("boardId"),
    title: formData.get("title") || undefined,
    description: formData.has("description") ? formData.get("description") || null : undefined,
    priority: formData.get("priority") || undefined,
    dueDate: formDateOrNull(formData.get("dueDate")),
    startDate: formDateOrNull(formData.get("startDate")),
    targetDate: formDateOrNull(formData.get("targetDate")),
    assigneeId: assigneeRaw === "" ? null : assigneeRaw || undefined,
    estimatedHours: hours.value,
    storyPoints: points.value,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados invalidos." };
  return { ok: true, data: parsed.data };
}
