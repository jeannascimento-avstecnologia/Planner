import {
  resolveCardStage,
  type BoardCard,
  type ColumnRow,
  type StageRow,
} from "@/components/board/types";

const STAGE_WEIGHT: Record<string, number> = {
  parado: 1,
  em_progresso: 2,
  em_andamento: 2,
  concluido: 3,
  cancelado: 4,
};

export function getStageSortWeight(stage: StageRow | null): number {
  if (!stage) return 0;
  const key = stage.system_key;
  if (key && key in STAGE_WEIGHT) return STAGE_WEIGHT[key];
  return 1.5;
}

/** Ordenação visual por peso de estágio; estável (preserva ordem original em empate). */
export function sortCardIdsByStageWeight(
  ids: string[],
  cardsById: Map<string, BoardCard>,
  columns: ColumnRow[],
  stagesById: Map<string, StageRow>,
): string[] {
  const indexed = ids.map((id, index) => ({ id, index }));
  indexed.sort((a, b) => {
    const cardA = cardsById.get(a.id);
    const cardB = cardsById.get(b.id);
    const weightA = cardA
      ? getStageSortWeight(resolveCardStage(cardA, columns, stagesById))
      : 0;
    const weightB = cardB
      ? getStageSortWeight(resolveCardStage(cardB, columns, stagesById))
      : 0;
    if (weightA !== weightB) return weightA - weightB;
    return a.index - b.index;
  });
  return indexed.map(({ id }) => id);
}
