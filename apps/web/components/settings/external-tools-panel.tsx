"use client";

import { Plus } from "lucide-react";
import { appToast } from "@/lib/toast";
import { btnBoardPrimarySm } from "@/lib/ui-classes";

export function ExternalToolsPanel() {
  return (
    <section className="space-y-4" data-testid="external-tools-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-aurora-fg">Ferramentas Externas</h2>
          <p className="text-sm text-aurora-muted">
            Providers de LLM e integracoes externas da plataforma.
          </p>
        </div>
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 ${btnBoardPrimarySm}`}
          data-testid="external-tools-add"
          onClick={() => appToast.info("CRUD de providers em breve.")}
        >
          <Plus className="h-4 w-4" />
          Adicionar
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-aurora-border">
        <table className="min-w-full text-sm" data-testid="external-tools-table">
          <thead className="bg-aurora-surface-2 text-left text-xs uppercase tracking-wide text-aurora-muted">
            <tr>
              <th className="px-4 py-2 font-semibold">Provider</th>
              <th className="px-4 py-2 font-semibold">Tipo</th>
              <th className="px-4 py-2 font-semibold">Status</th>
              <th className="px-4 py-2 font-semibold text-right">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-aurora-border bg-aurora-surface">
            <tr>
              <td colSpan={4} className="px-4 py-10 text-center text-sm text-aurora-muted">
                Nenhum provider cadastrado. Use o botao &quot;+&quot; para adicionar quando o CRUD estiver disponivel.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
