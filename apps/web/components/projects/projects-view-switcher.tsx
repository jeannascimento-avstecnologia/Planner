"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, List } from "lucide-react";

export type ProjectsLayout = "grid" | "list";

type Props = { value: ProjectsLayout };

export function ProjectsViewSwitcher({ value }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setLayout(layout: ProjectsLayout) {
    const params = new URLSearchParams(searchParams.toString());
    if (layout === "grid") params.delete("layout");
    else params.set("layout", layout);
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
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
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition ${
              on
                ? "border-aurora-accent bg-aurora-accent text-white"
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
