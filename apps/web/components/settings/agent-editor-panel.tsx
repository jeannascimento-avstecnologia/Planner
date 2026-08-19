"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import type { AgentRecord } from "@/lib/agents-mock";
import { btnBoardPrimarySm, inputBoardClassSm } from "@/lib/ui-classes";

type ChatMessage = { role: "user" | "assistant"; content: string };

type Props = {
  agent: AgentRecord;
};

export function AgentEditorPanel({ agent }: Props) {
  const [prompt, setPrompt] = useState(agent.systemPrompt);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");

  function sendTestMessage() {
    const text = draft.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      {
        role: "assistant",
        content: `[Teste local] Agente "${agent.name}" receberia sua mensagem com o prompt atual. Integracao LLM em breve.`,
      },
    ]);
    setDraft("");
  }

  return (
    <section className="space-y-6" data-testid="agent-editor-page">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/settings/agents"
          className="inline-flex items-center gap-1 text-sm text-aurora-muted hover:text-aurora-fg"
          data-testid="agent-editor-back"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        <div>
          <h2 className="text-lg font-semibold text-aurora-fg">{agent.name}</h2>
          <p className="text-sm text-aurora-muted">{agent.description}</p>
          <p className="mt-1 font-mono text-xs text-aurora-muted">Modelo: {agent.model}</p>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="agent-system-prompt" className="text-sm font-medium text-aurora-fg">
          Prompt do sistema
        </label>
        <textarea
          id="agent-system-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={8}
          className={`${inputBoardClassSm} min-h-[10rem] w-full resize-y`}
          data-testid="agent-system-prompt"
        />
      </div>

      <div className="rounded-lg border border-dashed border-aurora-border bg-aurora-surface-2/40 p-4">
        <p className="text-sm font-medium text-aurora-fg">Capacidades (tools)</p>
        <p className="mt-1 text-sm text-aurora-muted">Em breve — funcoes e integracoes do agente.</p>
      </div>

      <div className="space-y-3 rounded-lg border border-aurora-border p-4" data-testid="agent-test-chat">
        <h3 className="text-sm font-semibold text-aurora-fg">Chat de teste</h3>
        <ul className="max-h-56 space-y-2 overflow-y-auto text-sm">
          {messages.length === 0 ? (
            <li className="text-aurora-muted">Envie uma mensagem para simular o agente.</li>
          ) : (
            messages.map((m, i) => (
              <li
                key={`${m.role}-${i}`}
                className={`rounded-md px-3 py-2 ${
                  m.role === "user" ? "bg-aurora-brand-muted/30 text-aurora-fg" : "bg-aurora-surface-2 text-aurora-muted"
                }`}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                  {m.role === "user" ? "Voce" : "Agente"}
                </span>
                <p className="mt-0.5 whitespace-pre-wrap">{m.content}</p>
              </li>
            ))
          )}
        </ul>
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Mensagem de teste..."
            className={`min-w-0 flex-1 ${inputBoardClassSm}`}
            data-testid="agent-test-input"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                sendTestMessage();
              }
            }}
          />
          <button
            type="button"
            onClick={sendTestMessage}
            className={`inline-flex items-center gap-1 ${btnBoardPrimarySm}`}
            data-testid="agent-test-send"
          >
            <Send className="h-4 w-4" />
            Enviar
          </button>
        </div>
      </div>
    </section>
  );
}
