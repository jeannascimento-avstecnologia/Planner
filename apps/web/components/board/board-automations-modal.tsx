"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { AuroraModal } from "@/components/ui/aurora-modal";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { btnPrimary, btnBoardSecondary } from "@/lib/ui-classes";
import {
  createAutomationRule,
  deleteAutomationRule,
  updateAutomationRule,
} from "@/app/(app)/boards/[boardId]/actions";
import type { AutomationRuleRow, AutomationTriggerEvent } from "@nextgen/contracts";
import { createClient } from "@/lib/supabase/client";

type ColumnOption = { id: string; name: string };
type MemberOption = { id: string; name: string };

type Props = {
  boardId: string;
  orgId: string;
  columns: ColumnOption[];
  members: MemberOption[];
  open: boolean;
  onClose: () => void;
};

const TRIGGER_LABELS: Record<AutomationTriggerEvent, string> = {
  card_created: "Card criado",
  card_moved: "Card movido de coluna",
  priority_changed: "Prioridade alterada",
};

export function BoardAutomationsModal({ boardId, orgId, columns, members, open, onClose }: Props) {
  const [rules, setRules] = useState<AutomationRuleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [triggerEvent, setTriggerEvent] = useState<AutomationTriggerEvent>("card_moved");
  const [conditionColumnId, setConditionColumnId] = useState("");
  const [conditionPriority, setConditionPriority] = useState("");
  const [actionType, setActionType] = useState<
    "move_card" | "set_priority" | "set_assignee" | "send_slack" | "send_email" | "webhook"
  >("set_priority");
  const [actionColumnId, setActionColumnId] = useState("");
  const [actionPriority, setActionPriority] = useState("high");
  const [actionUserId, setActionUserId] = useState("");
  const [slackMessage, setSlackMessage] = useState("Card atualizado no Planner");
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("Notificacao Planner");
  const [emailHtml, setEmailHtml] = useState("<p>Evento de automacao</p>");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [tab, setTab] = useState<"rules" | "history">("rules");
  const [runs, setRuns] = useState<
    Array<{ id: string; status: string; ran_at: string; result: Record<string, unknown> }>
  >([]);

  const loadRules = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("automation_rules")
      .select("id, org_id, board_id, name, trigger_event, conditions, actions, active, created_at, updated_at")
      .eq("board_id", boardId)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
    } else {
      setRules((data ?? []) as AutomationRuleRow[]);
    }
    setLoading(false);
  }, [boardId]);

  const loadRuns = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("automation_runs")
      .select("id, status, ran_at, result, rule_id")
      .in(
        "rule_id",
        rules.map((r) => r.id),
      )
      .order("ran_at", { ascending: false })
      .limit(50);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRuns((data ?? []) as typeof runs);
  }, [rules]);

  useEffect(() => {
    if (open) void loadRules();
  }, [open, loadRules]);

  useEffect(() => {
    if (open && tab === "history" && rules.length) void loadRuns();
  }, [open, tab, rules, loadRuns]);

  function buildActionsJson(): string {
    if (actionType === "move_card") {
      return JSON.stringify([{ type: "move_card", target_column_id: actionColumnId }]);
    }
    if (actionType === "set_assignee") {
      return JSON.stringify([{ type: "set_assignee", user_id: actionUserId }]);
    }
    if (actionType === "send_slack") {
      return JSON.stringify([{ type: "send_slack", message: slackMessage }]);
    }
    if (actionType === "send_email") {
      return JSON.stringify([
        { type: "send_email", to: emailTo, subject: emailSubject, html: emailHtml },
      ]);
    }
    if (actionType === "webhook") {
      return JSON.stringify([{ type: "webhook", url: webhookUrl, body: { source: "planner" } }]);
    }
    return JSON.stringify([{ type: "set_priority", value: actionPriority }]);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Informe um nome para a regra.");
      return;
    }
    if (actionType === "move_card" && !actionColumnId) {
      toast.error("Selecione a coluna de destino.");
      return;
    }
    if (actionType === "set_assignee" && !actionUserId) {
      toast.error("Selecione o responsavel.");
      return;
    }
    if (actionType === "send_slack" && !slackMessage.trim()) {
      toast.error("Informe a mensagem Slack.");
      return;
    }
    if (actionType === "send_email" && (!emailTo.trim() || !emailSubject.trim())) {
      toast.error("Informe destinatario e assunto do email.");
      return;
    }
    if (actionType === "webhook" && !webhookUrl.trim()) {
      toast.error("Informe a URL do webhook.");
      return;
    }

    const fd = new FormData();
    fd.set("boardId", boardId);
    fd.set("orgId", orgId);
    fd.set("name", name.trim());
    fd.set("triggerEvent", triggerEvent);
    if (conditionColumnId) fd.set("conditionColumnId", conditionColumnId);
    if (conditionPriority) fd.set("conditionPriority", conditionPriority);
    fd.set("actions", buildActionsJson());

    startTransition(async () => {
      const res = await createAutomationRule(fd);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Regra criada.");
      setName("");
      setConditionColumnId("");
      setConditionPriority("");
      await loadRules();
    });
  }

  function toggleActive(rule: AutomationRuleRow) {
    const fd = new FormData();
    fd.set("ruleId", rule.id);
    fd.set("boardId", boardId);
    fd.set("active", String(!rule.active));
    startTransition(async () => {
      const res = await updateAutomationRule(fd);
      if ("error" in res) toast.error(res.error);
      else await loadRules();
    });
  }

  function removeRule(ruleId: string) {
    const fd = new FormData();
    fd.set("ruleId", ruleId);
    fd.set("boardId", boardId);
    startTransition(async () => {
      const res = await deleteAutomationRule(fd);
      if ("error" in res) toast.error(res.error);
      else {
        toast.success("Regra excluida.");
        await loadRules();
      }
    });
  }

  return (
    <AuroraModal
      open={open}
      onClose={onClose}
      title="Automacoes"
      subtitle="Se [evento] e [condicao], entao [acao] — executado no servidor ao registrar eventos."
      variant="board"
      size="lg"
      testId="board-automations-modal"
    >
      <div className="space-y-6">
        <div className="flex gap-2 border-b border-aurora-border pb-2">
          <button
            type="button"
            className={`text-sm font-medium ${tab === "rules" ? "text-aurora-accent" : "text-aurora-muted"}`}
            onClick={() => setTab("rules")}
          >
            Regras
          </button>
          <button
            type="button"
            className={`text-sm font-medium ${tab === "history" ? "text-aurora-accent" : "text-aurora-muted"}`}
            onClick={() => setTab("history")}
            data-testid="automation-history-tab"
          >
            Historico
          </button>
        </div>

        {tab === "history" ? (
          <section className="space-y-2" data-testid="automation-runs-list">
            {runs.length === 0 ? (
              <p className="text-sm text-aurora-muted">Nenhuma execucao registrada.</p>
            ) : (
              runs.map((run) => (
                <div key={run.id} className="rounded-lg border border-aurora-border p-3 text-sm">
                  <p className="font-medium text-aurora-fg">{run.status}</p>
                  <p className="text-xs text-aurora-muted">{new Date(run.ran_at).toLocaleString("pt-BR")}</p>
                </div>
              ))
            )}
          </section>
        ) : null}

        {tab === "rules" ? (
        <>
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-aurora-fg">Regras ativas</h3>
          {loading ? (
            <p className="text-sm text-aurora-muted">Carregando…</p>
          ) : rules.length === 0 ? (
            <p className="rounded-lg border border-dashed border-aurora-border bg-aurora-surface-2/40 p-4 text-sm text-aurora-muted">
              Nenhuma regra configurada.
            </p>
          ) : (
            <ul className="divide-y divide-aurora-border rounded-lg border border-aurora-border">
              {rules.map((rule) => (
                <li key={rule.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm" data-testid="automation-rule-row">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-aurora-fg">{rule.name}</p>
                    <p className="text-xs text-aurora-muted">
                      {TRIGGER_LABELS[rule.trigger_event as AutomationTriggerEvent] ?? rule.trigger_event}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ToggleSwitch
                      checked={rule.active}
                      onCheckedChange={() => toggleActive(rule)}
                      aria-label={`Ativar ${rule.name}`}
                      testId={`automation-toggle-${rule.id}`}
                    />
                    <button
                      type="button"
                      className={`${btnBoardSecondary} text-xs text-red-600`}
                      onClick={() => removeRule(rule.id)}
                      disabled={pending}
                    >
                      Excluir
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-aurora-border bg-aurora-surface-2/30 p-4">
          <h3 className="mb-3 text-sm font-semibold text-aurora-fg">Nova regra</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-aurora-muted">Nome</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-aurora-border bg-aurora-surface px-3 py-2 text-sm"
                placeholder="Ex: Done → prioridade alta"
                data-testid="automation-name-input"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-aurora-muted">Quando</label>
                <select
                  value={triggerEvent}
                  onChange={(e) => setTriggerEvent(e.target.value as AutomationTriggerEvent)}
                  className="w-full rounded-lg border border-aurora-border bg-aurora-surface px-3 py-2 text-sm"
                >
                  {(Object.keys(TRIGGER_LABELS) as AutomationTriggerEvent[]).map((k) => (
                    <option key={k} value={k}>
                      {TRIGGER_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-aurora-muted">Coluna (condicao, opcional)</label>
                <select
                  value={conditionColumnId}
                  onChange={(e) => setConditionColumnId(e.target.value)}
                  className="w-full rounded-lg border border-aurora-border bg-aurora-surface px-3 py-2 text-sm"
                >
                  <option value="">Qualquer coluna</option>
                  {columns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-aurora-muted">Prioridade (condicao, opcional)</label>
              <select
                value={conditionPriority}
                onChange={(e) => setConditionPriority(e.target.value)}
                className="w-full rounded-lg border border-aurora-border bg-aurora-surface px-3 py-2 text-sm"
              >
                <option value="">Qualquer prioridade</option>
                <option value="low">Baixa</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-aurora-muted">Entao (acao)</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value as typeof actionType)}
                  className="w-full rounded-lg border border-aurora-border bg-aurora-surface px-3 py-2 text-sm"
                >
                  <option value="set_priority">Alterar prioridade</option>
                  <option value="move_card">Mover para coluna</option>
                  <option value="set_assignee">Definir responsavel</option>
                  <option value="send_slack">Enviar Slack</option>
                  <option value="send_email">Enviar email</option>
                  <option value="webhook">Webhook HTTP</option>
                </select>
              </div>
              <div>
                {actionType === "move_card" ? (
                  <>
                    <label className="mb-1 block text-xs font-medium text-aurora-muted">Coluna destino</label>
                    <select
                      value={actionColumnId}
                      onChange={(e) => setActionColumnId(e.target.value)}
                      className="w-full rounded-lg border border-aurora-border bg-aurora-surface px-3 py-2 text-sm"
                    >
                      <option value="">Selecione…</option>
                      {columns.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </>
                ) : null}
                {actionType === "set_priority" ? (
                  <>
                    <label className="mb-1 block text-xs font-medium text-aurora-muted">Nova prioridade</label>
                    <select
                      value={actionPriority}
                      onChange={(e) => setActionPriority(e.target.value)}
                      className="w-full rounded-lg border border-aurora-border bg-aurora-surface px-3 py-2 text-sm"
                    >
                      <option value="low">Baixa</option>
                      <option value="medium">Media</option>
                      <option value="high">Alta</option>
                      <option value="urgent">Urgente</option>
                    </select>
                  </>
                ) : null}
                {actionType === "set_assignee" ? (
                  <>
                    <label className="mb-1 block text-xs font-medium text-aurora-muted">Responsavel</label>
                    <select
                      value={actionUserId}
                      onChange={(e) => setActionUserId(e.target.value)}
                      className="w-full rounded-lg border border-aurora-border bg-aurora-surface px-3 py-2 text-sm"
                    >
                      <option value="">Selecione…</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </>
                ) : null}
                {actionType === "send_slack" ? (
                  <>
                    <label className="mb-1 block text-xs font-medium text-aurora-muted">Mensagem Slack</label>
                    <input
                      value={slackMessage}
                      onChange={(e) => setSlackMessage(e.target.value)}
                      className="w-full rounded-lg border border-aurora-border bg-aurora-surface px-3 py-2 text-sm"
                    />
                  </>
                ) : null}
                {actionType === "send_email" ? (
                  <div className="space-y-2">
                    <input
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                      placeholder="email@empresa.com"
                      className="w-full rounded-lg border border-aurora-border bg-aurora-surface px-3 py-2 text-sm"
                    />
                    <input
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full rounded-lg border border-aurora-border bg-aurora-surface px-3 py-2 text-sm"
                    />
                  </div>
                ) : null}
                {actionType === "webhook" ? (
                  <>
                    <label className="mb-1 block text-xs font-medium text-aurora-muted">URL webhook</label>
                    <input
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      className="w-full rounded-lg border border-aurora-border bg-aurora-surface px-3 py-2 text-sm"
                    />
                  </>
                ) : null}
              </div>
            </div>

            <button type="submit" disabled={pending} className={btnPrimary} data-testid="automation-create-submit">
              {pending ? "Salvando…" : "Criar regra"}
            </button>
          </form>
        </section>
        </>
        ) : null}
      </div>
    </AuroraModal>
  );
}
