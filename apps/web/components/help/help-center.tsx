"use client";

import Link from "next/link";
import { Compass } from "lucide-react";
import { HELP_CATEGORIES, type HelpBadge, type HelpSection } from "@/lib/help-content";
import { useOnboardingTour } from "@/components/onboarding/onboarding-tour-provider";
import { ALL_PAGE_TOUR_IDS } from "@/lib/page-tour-registry";
import { PAGE_TOUR_LABELS, type PageTourId } from "@/lib/page-tour-steps";
import { btnPrimary, dataPanelClass, dataPanelEnterClass, linkClass } from "@/lib/ui-classes";

const PAGE_TOUR_ROUTES: Record<PageTourId, string> = {
  home: "/boards",
  projects: "/projects",
  calendar: "/calendar",
  plan: "/plan",
  workload: "/workload",
  settings: "/settings",
  help: "/help",
  "board-kanban": "/boards",
};

function HelpBadgePill({ badge }: { badge: HelpBadge }) {
  const colors =
    badge === "Admin"
      ? "bg-aurora-brand-muted/50 text-aurora-brand"
      : "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${colors}`}>
      {badge}
    </span>
  );
}

function HelpSectionCard({ section }: { section: HelpSection }) {
  return (
    <details
      id={`help-${section.id}`}
      className={`group ${dataPanelClass} ${dataPanelEnterClass} overflow-hidden`}
      data-testid={`help-section-${section.id}`}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold text-aurora-fg">{section.title}</span>
          {section.badge ? <HelpBadgePill badge={section.badge} /> : null}
        </span>
        <span
          className="shrink-0 text-xs text-aurora-muted transition group-open:rotate-180"
          aria-hidden
        >
          ▼
        </span>
      </summary>
      <div className="space-y-3 border-t border-aurora-border/60 px-4 py-3">
        <p className="text-sm text-aurora-muted">{section.summary}</p>
        {section.steps.length > 0 ? (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-aurora-fg">Como usar</p>
            <ol className="list-decimal space-y-1 pl-4 text-sm text-aurora-fg">
              {section.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        ) : null}
        {section.tips && section.tips.length > 0 ? (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-aurora-fg">Dicas</p>
            <ul className="list-disc space-y-1 pl-4 text-sm text-aurora-muted">
              {section.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {section.href ? (
          <Link href={section.href} className={`inline-block text-sm ${linkClass}`}>
            Abrir pagina →
          </Link>
        ) : null}
      </div>
    </details>
  );
}

export function HelpCenter() {
  const { openGlobalTour } = useOnboardingTour();

  return (
    <div className="space-y-6">
      <div
        className={`${dataPanelClass} ${dataPanelEnterClass} flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between`}
        data-testid="help-tour-card"
        data-tour="help-tour-global"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-aurora-fg">Tour guiado</p>
          <p className="text-sm text-aurora-muted">
            Reveja o passo a passo interativo pelas areas principais do app.
          </p>
        </div>
        <button
          type="button"
          onClick={openGlobalTour}
          className={`inline-flex shrink-0 items-center justify-center gap-2 ${btnPrimary}`}
          data-testid="onboarding-tour-trigger"
        >
          <Compass className="h-4 w-4" aria-hidden />
          Ver tour guiado
        </button>
      </div>

      <section
        className={`${dataPanelClass} ${dataPanelEnterClass} space-y-3 p-4`}
        data-testid="help-page-tours"
      >
        <h2 className="text-sm font-semibold text-aurora-fg">Tours por area</h2>
        <p className="text-sm text-aurora-muted">
          Abra o tour contextual de cada pagina. No kanban, entre em um projeto antes de iniciar.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {ALL_PAGE_TOUR_IDS.filter((id) => id !== "board-kanban").map((tourId) => (
            <li key={tourId}>
              <Link
                href={PAGE_TOUR_ROUTES[tourId]}
                className="flex items-center justify-between rounded-lg border border-aurora-border bg-aurora-surface-2/40 px-3 py-2 text-sm transition hover:border-aurora-brand/40"
                data-testid={`help-page-tour-${tourId}`}
              >
                <span className="font-medium text-aurora-fg">{PAGE_TOUR_LABELS[tourId]}</span>
                <span className="text-xs text-aurora-brand">Abrir pagina</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-xs text-aurora-muted">
          Tour do kanban: abra um projeto — o tour contextual inicia na primeira visita ao board.
        </p>
      </section>

      <div className="grid gap-8 lg:grid-cols-[12rem_minmax(0,1fr)]" data-testid="help-center">
        <nav
          className="hidden lg:block lg:sticky lg:top-20 lg:self-start"
          aria-label="Indice da ajuda"
          data-testid="help-index"
          data-tour="help-index"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-aurora-muted">Indice</p>
          <ul className="space-y-3 text-sm">
            {HELP_CATEGORIES.map((cat) => (
              <li key={cat.id}>
                <p className="mb-1 font-medium text-aurora-fg">{cat.title}</p>
                <ul className="space-y-0.5 border-l border-aurora-border pl-2">
                  {cat.sections.map((sec) => (
                    <li key={sec.id}>
                      <a
                        href={`#help-${sec.id}`}
                        className="block truncate py-0.5 text-aurora-muted transition hover:text-aurora-brand"
                      >
                        {sec.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-8" data-tour="help-categories">
          {HELP_CATEGORIES.map((cat) => (
            <section key={cat.id} aria-labelledby={`help-cat-${cat.id}`} data-testid={`help-category-${cat.id}`}>
              <h2 id={`help-cat-${cat.id}`} className="mb-3 text-lg font-semibold text-aurora-fg">
                {cat.title}
              </h2>
              <div className="space-y-2">
                {cat.sections.map((sec) => (
                  <HelpSectionCard key={sec.id} section={sec} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
