export type DashboardThroughputPoint = { weekStart: string; count: number };
export type DashboardCfdPoint = { columnId: string; columnName: string; count: number };
export type DashboardBottleneck = { columnId: string; avgDwellHours: number; samples: number };
export type DashboardLeadTime = { avgHours: number; samples: number };

export type BoardDashboardData = {
  throughput: DashboardThroughputPoint[];
  cfd: DashboardCfdPoint[];
  bottlenecks: DashboardBottleneck[];
  leadTime: DashboardLeadTime;
};

export function parseBundle(raw: unknown): BoardDashboardData {
  const obj = (raw ?? {}) as Record<string, unknown>;
  return {
    throughput: Array.isArray(obj.throughput) ? (obj.throughput as DashboardThroughputPoint[]) : [],
    cfd: Array.isArray(obj.cfd) ? (obj.cfd as DashboardCfdPoint[]) : [],
    bottlenecks: Array.isArray(obj.bottlenecks) ? (obj.bottlenecks as DashboardBottleneck[]) : [],
    leadTime: (obj.leadTime as DashboardLeadTime) ?? { avgHours: 0, samples: 0 },
  };
}
