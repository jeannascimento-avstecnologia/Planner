export type CardDeleteImpact = {
  subtasks: number;
  dependencies: number;
};

export function buildCardDeleteConfirmMessage(impact: CardDeleteImpact | null): string {
  const base = "Tem certeza que deseja excluir este card? Esta acao nao pode ser desfeita.";
  if (!impact) return base;

  const parts: string[] = [];
  if (impact.subtasks > 0) {
    parts.push(
      impact.subtasks === 1
        ? "1 subtarefa vinculada"
        : `${impact.subtasks} subtarefas vinculadas`,
    );
  }
  if (impact.dependencies > 0) {
    parts.push(
      impact.dependencies === 1
        ? "1 dependencia vinculada"
        : `${impact.dependencies} dependencias vinculadas`,
    );
  }
  if (parts.length === 0) return base;
  return `${base} Isso remove permanentemente ${parts.join(" e ")}.`;
}
