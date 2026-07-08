import Link from "next/link";
import type { ReactNode } from "react";
import { pageBreadcrumbClass } from "@/lib/ui-classes";

type Props = {
  backHref?: string;
  backLabel?: string;
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  toolbar?: ReactNode;
  actions?: ReactNode;
};

export function PlanningPageHeader({
  backHref = "/boards",
  backLabel = "Projetos",
  title,
  description,
  icon,
  toolbar,
  actions,
}: Props) {
  return (
    <header className="aurora-page-header space-y-4" data-testid="planning-page-header">
      <div className="space-y-2">
        {backHref ? (
          <Link href={backHref} className={pageBreadcrumbClass}>
            ← {backLabel}
          </Link>
        ) : null}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {icon ? (
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-aurora-brand-muted text-aurora-brand shadow-sm"
                aria-hidden
              >
                {icon}
              </span>
            ) : null}
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-aurora-fg">{title}</h1>
              {description ? <div className="mt-1 text-sm text-aurora-muted">{description}</div> : null}
            </div>
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </div>
      {toolbar ? <div className="flex flex-wrap items-center justify-between gap-3">{toolbar}</div> : null}
    </header>
  );
}
