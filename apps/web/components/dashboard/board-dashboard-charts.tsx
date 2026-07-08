"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BoardDashboardData } from "@/lib/load-dashboard";

type Props = {
  data: BoardDashboardData;
};

export function BoardDashboardCharts({ data }: Props) {
  const throughputData = [...data.throughput].reverse().map((p) => ({
    week: p.weekStart,
    count: p.count,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2" data-testid="board-dashboard-charts">
      <section className="rounded-xl border border-aurora-border bg-aurora-surface p-4">
        <h3 className="mb-3 text-sm font-semibold text-aurora-fg">CFD (WIP atual por coluna)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.cfd}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--aurora-border)" />
              <XAxis dataKey="columnName" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="#6366f1" fill="#6366f180" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-xl border border-aurora-border bg-aurora-surface p-4">
        <h3 className="mb-3 text-sm font-semibold text-aurora-fg">Throughput (conclusoes/semana)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={throughputData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--aurora-border)" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-xl border border-aurora-border bg-aurora-surface p-4 lg:col-span-2">
        <div className="mb-4 flex flex-wrap gap-6">
          <div>
            <p className="text-xs uppercase text-aurora-muted">Lead time medio</p>
            <p className="text-2xl font-semibold text-aurora-fg" data-testid="dashboard-lead-time">
              {data.leadTime.avgHours}h
            </p>
            <p className="text-xs text-aurora-muted">{data.leadTime.samples} amostras</p>
          </div>
        </div>
        <h3 className="mb-3 text-sm font-semibold text-aurora-fg">Gargalos (tempo medio por coluna)</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-aurora-border text-left text-xs uppercase text-aurora-muted">
                <th className="py-2 pr-4">Coluna</th>
                <th className="py-2 pr-4">Horas medias</th>
                <th className="py-2">Amostras</th>
              </tr>
            </thead>
            <tbody>
              {data.bottlenecks.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-4 text-aurora-muted">
                    Sem dados de cycle time ainda.
                  </td>
                </tr>
              ) : (
                data.bottlenecks.map((b) => (
                  <tr key={b.columnId} className="border-b border-aurora-border/60" data-testid="dashboard-bottleneck-row">
                    <td className="py-2 pr-4 font-mono text-xs">{b.columnId.slice(0, 8)}…</td>
                    <td className="py-2 pr-4">{b.avgDwellHours}h</td>
                    <td className="py-2">{b.samples}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
