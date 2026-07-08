"use client";

import Link from "next/link";
import { CalendarRange } from "lucide-react";
import { linkClass } from "@/lib/ui-classes";

type Props = {
  cardId: string;
  estimatedHours: number | null;
};

export function CardPlanWorkSection({ cardId, estimatedHours }: Props) {
  return (
    <div
      className="rounded-xl border border-aurora-brand/25 bg-aurora-brand-muted/30 px-3 py-2.5 shadow-sm"
      data-testid="card-plan-work"
    >
      <p className="flex items-center gap-1.5 text-xs font-semibold text-aurora-brand">
        <CalendarRange className="h-3.5 w-3.5" aria-hidden />
        Plano de trabalho
      </p>
      <p className="mt-1 text-xs text-aurora-muted">
        {estimatedHours != null && estimatedHours > 0
          ? `${estimatedHours}h planejadas (total derivado das alocacoes diarias).`
          : "Alocar horas por dia no calendario pessoal de 11 dias."}
      </p>
      <Link href="/plan" className={linkClass + " mt-2 inline-block text-xs font-medium"}>
        Abrir em Meu plano →
      </Link>
    </div>
  );
}
