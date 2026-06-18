export type ProjectBoardRow = {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  archived: boolean;
  tiflux_enabled: boolean;
  integrations: Record<string, unknown>;
  created_at: string;
  created_by: string | null;
  owner_name: string | null;
  open_cards: number;
  next_due: string | null;
};

export type ProjectGroupBy = "nome" | "responsavel" | "data" | "prazo";

export const PROJECT_GROUP_LABELS: Record<ProjectGroupBy, string> = {
  nome: "Nome",
  responsavel: "Responsavel",
  data: "Data de criacao",
  prazo: "Proximo prazo",
};
