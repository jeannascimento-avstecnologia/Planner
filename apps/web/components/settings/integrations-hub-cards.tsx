import Link from "next/link";
import { Calendar, MessageSquare, Plug } from "lucide-react";
import { settingsTileInteractive } from "@/lib/ui-classes";
import { settingsCardToneClasses, type SettingsCardTone } from "@/lib/settings-card-tone";

const cards: Array<{
  href: string;
  title: string;
  description: string;
  icon: typeof Plug;
  testId: string;
  tone: SettingsCardTone;
}> = [
  {
    href: "/settings/integrations/teams",
    title: "Microsoft Teams",
    description: "Export one-way para Planner tasks.",
    icon: Plug,
    testId: "integration-card-teams",
    tone: "indigo",
  },
  {
    href: "/settings/integrations/slack",
    title: "Slack",
    description: "Incoming Webhook para notificacoes e automacoes.",
    icon: MessageSquare,
    testId: "integration-card-slack",
    tone: "violet",
  },
  {
    href: "/settings/integrations/google",
    title: "Google Calendar",
    description: "Export one-way de prazos para calendario.",
    icon: Calendar,
    testId: "integration-card-google",
    tone: "sky",
  },
];

export function IntegrationsHubCards() {
  return (
    <div className="space-y-4" data-testid="integrations-hub-page">
      <div>
        <h2 className="text-lg font-semibold text-aurora-fg">Integracoes</h2>
        <p className="text-sm text-aurora-muted">Conecte canais externos por organizacao.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ href, title, description, icon: Icon, testId, tone }) => {
          const style = settingsCardToneClasses(tone);
          return (
            <Link
              key={href}
              href={href}
              className={`${settingsTileInteractive} group block p-4 ring-1 ring-transparent ${style.border} hover:ring-1 ${style.ring}`}
              data-testid={testId}
            >
              <span className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${style.icon}`}>
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="font-semibold text-aurora-fg">{title}</h3>
              <p className="mt-1 text-sm text-aurora-muted">{description}</p>
              <span className={`mt-3 inline-block text-sm font-medium ${style.link}`}>Configurar →</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
