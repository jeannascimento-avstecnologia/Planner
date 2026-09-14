"use client";

import { useMemo } from "react";
import type { TimelineDependencyPath } from "@/lib/timeline-dependencies";

const DEP_STROKE = "#f0883e";

type Props = {
  width: number;
  height: number;
  paths: TimelineDependencyPath[];
};

function pathOrigin(d: string): { x: number; y: number } | null {
  const match = /^M\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/.exec(d);
  if (!match) return null;
  const x = Number(match[1]);
  const y = Number(match[2]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

export function TimelineDependencyLayer({ width, height, paths }: Props) {
  const markerId = "timeline-fs-arrow";
  const rendered = useMemo(() => paths, [paths]);

  return (
    <svg
      data-testid="timeline-dependency-layer"
      className="pointer-events-none absolute inset-0 z-[3]"
      width={width}
      height={height}
      viewBox={`0 0 ${Math.max(width, 1)} ${Math.max(height, 1)}`}
      aria-hidden
    >
      <defs>
        <marker
          id={markerId}
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="4"
          orient="auto"
        >
          <path d="M0,0 L8,4 L0,8 Z" fill={DEP_STROKE} />
        </marker>
      </defs>
      {rendered.map((p) => {
        const origin = pathOrigin(p.d);
        return (
          <g key={p.dependencyId}>
            {origin ? (
              <circle cx={origin.x} cy={origin.y} r={2.5} fill={DEP_STROKE} />
            ) : null}
            <path
              data-testid={`timeline-dep-${p.dependencyId}`}
              d={p.d}
              fill="none"
              stroke={DEP_STROKE}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              markerEnd={`url(#${markerId})`}
            />
          </g>
        );
      })}
    </svg>
  );
}
