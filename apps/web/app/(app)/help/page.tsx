import { CircleHelp } from "lucide-react";
import { HelpCenter } from "@/components/help/help-center";
import { PageTourTrigger } from "@/components/onboarding/page-tour-trigger";
import { PlanningPageHeader } from "@/components/shell/planning-page-header";
import { PAGE_COPY } from "@/lib/page-copy";

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6" data-testid="help-page">
      <PlanningPageHeader
        backHref="/boards"
        backLabel="Home"
        title={PAGE_COPY.help.title}
        description={PAGE_COPY.help.description}
        icon={<CircleHelp className="h-5 w-5" aria-hidden />}
        actions={<PageTourTrigger />}
      />
      <HelpCenter />
    </div>
  );
}
