"use client";

import { OrgSwitcher } from "@/components/organizations/org-switcher";
import type { UserOrgRow } from "@/lib/active-org-constants";

type Props = {
  activeOrgId: string;
  activeOrgName: string;
  activeOrgLogoUrl: string | null;
  orgs: UserOrgRow[];
};

const SETTINGS_ORG_SWITCHER_TEST_IDS = {
  root: "settings-org-switcher",
  trigger: "settings-org-switcher-trigger",
  menu: "settings-org-switcher-menu",
  optionPrefix: "settings-org-option",
} as const;

export function SettingsOrgSwitcher(props: Props) {
  return <OrgSwitcher {...props} testIds={SETTINGS_ORG_SWITCHER_TEST_IDS} />;
}
