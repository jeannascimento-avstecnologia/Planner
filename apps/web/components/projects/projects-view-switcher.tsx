"use client";

import { LayoutGrid, List } from "lucide-react";
import { viewSwitcherActiveClass, viewSwitcherMotion } from "@/lib/ui-classes";

export type ProjectsLayout = "grid" | "list";

type Props = {
  value: ProjectsLayout;
  onChange: (layout: ProjectsLayout) => void;
};

export function ProjectsViewSwitcher({ value, onChange }: Props) {
  function setLayout(layout: ProjectsLayout) {
    if (value === layout) return;
    onChange(layout);
  }

  const modes = [
    { id: "grid" as const, label: "Grade", icon: LayoutGrid },
    { id: "list" as const, label: "Lista", icon: List },
  ];

  return (
    <div className="flex w-full gap-2">
      {modes.map(({ id, label, icon: Icon }) => {
        const on = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setLayout(id)}
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium ${viewSwitcherMotion} ${
              on
                ? viewSwitcherActiveClass
                : "border-aurora-border text-aurora-muted hover:bg-aurora-surface-2 hover:text-aurora-fg"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function parseProjectsLayout(raw: string | null): ProjectsLayout {
  return raw === "list" ? "list" : "grid";
}

export function projectsLayoutToParam(layout: ProjectsLayout): string | null {
  return layout === "grid" ? null : layout;
}
