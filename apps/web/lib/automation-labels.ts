import type { AutomationAction, AutomationRuleRow, AutomationTriggerEvent } from "@nextgen/contracts";

type ColumnOption = { id: string; name: string };
type StageOption = { id: string; name: string };

export const TRIGGER_LABELS: Record<AutomationTriggerEvent, string> = {
  card_created: "Card criado",
  card_moved: "Card movido de coluna",
  priority_changed: "Prioridade alterada",
  stage_changed: "Estagio alterado",
  due_overdue: "Prazo vencido (diario)",
};

export const ACTION_LABELS: Record<string, string> = {
  move_card: "Mover para coluna",
  set_priority: "Alterar prioridade",
  set_assignee: "Definir responsavel",
  set_stage: "Alterar estagio",
  apply_column_default_stage: "Aplicar estagio padrao da coluna",
  add_tag: "Adicionar marcador",
  send_slack: "Enviar Slack",
  send_email: "Enviar email",
  webhook: "Webhook HTTP",
};

function actionSummary(
  action: AutomationAction,
  columns: ColumnOption[],
  stages: StageOption[],
): string {
  const col = (id: string) => columns.find((c) => c.id === id)?.name ?? id.slice(0, 8);
  const stage = (id: string) => stages.find((s) => s.id === id)?.name ?? id.slice(0, 8);

  switch (action.type) {
    case "move_card":
      return `mover para ${col(action.target_column_id)}`;
    case "set_stage":
      return `estagio ${stage(action.stage_id)}`;
    case "apply_column_default_stage":
      return "estagio padrao da coluna";
    case "add_tag":
      return `marcador "${action.tag_name ?? "Atrasado"}"`;
    case "set_priority":
      return `prioridade ${action.value}`;
    case "set_assignee":
      return "definir responsavel";
    default:
      return action.type;
  }
}

export function formatAutomationRuleSummary(
  rule: AutomationRuleRow,
  columns: ColumnOption[],
  stages: StageOption[],
): string {
  const trigger = TRIGGER_LABELS[rule.trigger_event as AutomationTriggerEvent] ?? rule.trigger_event;
  const parts: string[] = [trigger];

  const cond = rule.conditions as { column_id?: string; stage_id?: string; priority?: string };
  if (cond.column_id) parts.push(`coluna ${col(cond.column_id)}`);
  if (cond.stage_id) parts.push(`estagio ${stage(cond.stage_id)}`);
  if (cond.priority) parts.push(`prioridade ${cond.priority}`);

  const actions = Array.isArray(rule.actions) ? rule.actions : [];
  if (actions.length) {
    parts.push(`→ ${actions.map((a) => actionSummary(a, columns, stages)).join(", ")}`);
  }

  return parts.join(" · ");

  function col(id: string) {
    return columns.find((c) => c.id === id)?.name ?? id.slice(0, 8);
  }
  function stage(id: string) {
    return stages.find((s) => s.id === id)?.name ?? id.slice(0, 8);
  }
}
