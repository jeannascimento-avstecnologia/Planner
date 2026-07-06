import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ boardId: string }> };

export default async function BoardAutomationsPage({ params }: Props) {
  const { boardId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rules } = await supabase
    .from("automation_rules")
    .select("id, name, active, trigger_event, created_at")
    .eq("board_id", boardId)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6" data-testid="automations-page">
      <Link href={`/boards/${boardId}`} className="text-xs text-aurora-muted hover:text-aurora-fg">
        ← Projeto
      </Link>
      <h1 className="text-xl font-semibold">Automacoes</h1>
      <ul className="divide-y divide-aurora-border rounded-lg border border-aurora-border">
        {(rules ?? []).length === 0 ? (
          <li className="p-4 text-sm text-aurora-muted">Nenhuma regra configurada.</li>
        ) : (
          (rules ?? []).map((r) => (
            <li key={r.id} className="flex items-center justify-between p-4 text-sm">
              <span>{r.name}</span>
              <span className="text-aurora-muted">{r.trigger_event}</span>
              <span>{r.active ? "Ativa" : "Off"}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
