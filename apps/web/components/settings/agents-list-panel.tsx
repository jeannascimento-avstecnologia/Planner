"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import type { AgentRecord } from "@/lib/agents-mock";
import { appToast } from "@/lib/toast";
import { btnBoardPrimarySm } from "@/lib/ui-classes";

type Props = {
  agents: AgentRecord[];
};

export function AgentsListPanel({ agents }: Props) {
  return (
    <section className="space-y-4" data-testid="agents-list-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-aurora-fg">Agentes</h2>
          <p className="text-sm text-aurora-muted">Configure prompts e teste conversas com agentes de IA.</p>
        </div>
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 ${btnBoardPrimarySm}`}
          data-testid="agents-add"
          onClick={() => appToast.info("Criacao de agentes em breve.")}
        >
          <Plus className="h-4 w-4" />
          Novo agente
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-aurora-border">
        <table className="min-w-full text-sm" data-testid="agents-table">
          <thead className="bg-aurora-surface-2 text-left text-xs uppercase tracking-wide text-aurora-muted">
            <tr>
              <th className="px-4 py-2 font-semibold">Nome</th>
              <th className="px-4 py-2 font-semibold">Descricao</th>
              <th className="px-4 py-2 font-semibold">Modelo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-aurora-border bg-aurora-surface">
            {agents.map((agent) => (
              <tr key={agent.id} className="hover:bg-aurora-surface-2/60">
                <td className="px-4 py-3">
                  <Link
                    href={`/settings/agents/${agent.id}`}
                    className="font-medium text-aurora-brand hover:underline"
                    data-testid={`agent-link-${agent.id}`}
                  >
                    {agent.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-aurora-muted">{agent.description}</td>
                <td className="px-4 py-3 font-mono text-xs text-aurora-fg">{agent.model}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
