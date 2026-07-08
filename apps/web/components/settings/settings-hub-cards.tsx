import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { settingsTileInteractive } from "@/lib/ui-classes";
import { settingsCardToneClasses, type SettingsCardTone } from "@/lib/settings-card-tone";

export type SettingsHubCard = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  testId: string;
  tone: SettingsCardTone;
};

type Props = {
  orgName: string;
  userRoleLabel: string;
  organizationCards: SettingsHubCard[];
  adminCards: SettingsHubCard[];
};

function CardGrid({ cards }: { cards: SettingsHubCard[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {cards.map(({ href, title, description, icon: Icon, testId, tone }) => {
        const style = settingsCardToneClasses(tone);
        return (
          <Link
            key={href}
            href={href}
            className={`${settingsTileInteractive} group flex gap-4 p-4 ring-1 ring-transparent ${style.border} hover:ring-1 ${style.ring}`}
            data-testid={testId}
            data-settings-tone-card={tone}
          >
            <span
              data-settings-tone-icon
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm transition group-hover:scale-105 ${style.icon}`}
            >
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <h3 className="font-semibold text-aurora-fg">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-aurora-muted">{description}</p>
              <span
                data-settings-tone-link
                className={`mt-2 inline-flex items-center text-sm font-medium ${style.link}`}
              >
                Abrir →
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export function SettingsHubCards({ orgName, userRoleLabel, organizationCards, adminCards }: Props) {
  return (
    <div className="space-y-8" data-testid="settings-hub-page">
      <div className="rounded-xl border border-violet-200/60 bg-gradient-to-br from-violet-50/80 via-aurora-surface to-sky-50/50 p-4 dark:border-violet-900/40 dark:from-violet-950/30 dark:to-sky-950/20 md:p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
          Organizacao ativa
        </p>
        <h2 className="mt-1 text-xl font-semibold text-aurora-fg">{orgName}</h2>
        <p className="mt-1 text-sm text-aurora-muted">
          Seu papel: <span className="font-medium text-aurora-fg">{userRoleLabel}</span>
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-aurora-fg">Organizacao</h3>
        <CardGrid cards={organizationCards} />
      </section>

      {adminCards.length ? (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-aurora-fg">Administracao</h3>
          <CardGrid cards={adminCards} />
        </section>
      ) : null}
    </div>
  );
}
