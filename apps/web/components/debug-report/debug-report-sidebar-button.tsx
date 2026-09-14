"use client";

import { Bug } from "lucide-react";
import { useDebugReportTrigger } from "./debug-report-provider";

type Props = {
  collapsed: boolean;
};

export function DebugReportSidebarButton({ collapsed }: Props) {
  const { openReport, isPreparing } = useDebugReportTrigger();
  const label = isPreparing ? "Capturando..." : "Reportar problema";

  return (
    <button
      type="button"
      onClick={() => void openReport()}
      disabled={isPreparing}
      aria-label="Reportar problema"
      title={collapsed ? "Reportar problema" : undefined}
      data-testid="sidebar-debug-report"
      className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-white/85 transition hover:bg-white/10 hover:text-white disabled:opacity-60 ${
        collapsed ? "justify-center" : ""
      }`}
    >
      <Bug className="h-4 w-4 shrink-0 text-white" />
      {collapsed ? <span className="sr-only">{label}</span> : label}
    </button>
  );
}
