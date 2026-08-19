import { updateCardInput, type UpdateCardInput } from "@nextgen/contracts";

function formDateOrNull(raw: FormDataEntryValue | null): string | null | undefined {
  if (raw === null) return undefined;
  if (raw === "") return null;
  return `${raw}T12:00:00.000Z`;
}

export function parseUpdateCardFormData(formData: FormData):
  | { ok: true; data: UpdateCardInput }
  | { ok: false; error: string } {
  const assigneeRaw = formData.get("assigneeId");
  const estRaw = formData.get("estimatedHours");
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
    estimatedHours: estRaw === "" ? null : estRaw ?? undefined,
  });
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };
  return { ok: true, data: parsed.data };
}
