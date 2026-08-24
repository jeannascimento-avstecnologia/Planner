export type AgentRecord = {
  id: string;
  name: string;
  description: string;
  model: string;
  systemPrompt: string;
};

/** Dados mock ate persistencia de agentes (fast-follow). */
export const MOCK_AGENTS: AgentRecord[] = [
  {
    id: "planner-assistant",
    name: "Assistente do Planner",
    description: "Ajuda a resumir boards e sugerir proximos passos.",
    model: "gpt-4.1-mini",
    systemPrompt:
      "Voce e um assistente do Agify Planner. Responda de forma objetiva em portugues do Brasil.",
  },
  {
    id: "reviewer",
    name: "Revisor de tarefas",
    description: "Revisa titulos e descricoes de cards antes de publicar.",
    model: "claude-sonnet-4",
    systemPrompt: "Voce revisa tarefas de projeto e sugere melhorias claras e curtas.",
  },
];

export function getAgentById(agentId: string): AgentRecord | undefined {
  return MOCK_AGENTS.find((a) => a.id === agentId);
}
