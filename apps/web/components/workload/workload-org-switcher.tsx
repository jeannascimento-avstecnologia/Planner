"use client";

import { OrgSwitcher } from "@/components/organizations/org-switcher";
import type { UserOrgRow } from "@/lib/active-org-constants";

type Props = {
  activeOrgId: string;
  activeOrgName: string;
  activeOrgLogoUrl: string | null;
  orgs: UserOrgRow[];
};

const WORKLOAD_ORG_SWITCHER_TEST_IDS = {
  root: "workload-org-switcher",
  trigger: "workload-org-switcher-trigger",
  menu: "workload-org-switcher-menu",
  optionPrefix: "workload-org-option",
} as const;

export function WorkloadOrgSwitcher(props: Props) {
  return <OrgSwitcher {...props} className="max-w-[17rem]" testIds={WORKLOAD_ORG_SWITCHER_TEST_IDS} />;
}
