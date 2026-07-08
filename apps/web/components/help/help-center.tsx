"use client";

import Link from "next/link";
import { HELP_CATEGORIES, type HelpBadge, type HelpSection } from "@/lib/help-content";
import { dataPanelClass, dataPanelEnterClass, linkClass } from "@/lib/ui-classes";

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
  return (
    <div className="grid gap-8 lg:grid-cols-[12rem_minmax(0,1fr)]" data-testid="help-center">
      <nav
        className="hidden lg:block lg:sticky lg:top-20 lg:self-start"
        aria-label="Indice da ajuda"
        data-testid="help-index"
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

      <div className="space-y-8">
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
  );
}
