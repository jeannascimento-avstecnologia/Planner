"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { setActiveOrgAction } from "@/app/(app)/settings/organizations/actions";
import { OrgLogo } from "@/components/organizations/OrgLogo";
import type { UserOrgRow } from "@/lib/active-org-constants";
import { focusRingAurora } from "@/lib/ui-classes";
import { appToast } from "@/lib/toast";

type Props = {
  activeOrgId: string;
  activeOrgName: string;
  activeOrgLogoUrl: string | null;
  orgs: UserOrgRow[];
};

export function SettingsOrgSwitcher({ activeOrgId, activeOrgName, activeOrgLogoUrl, orgs }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function switchOrg(orgId: string) {
    if (orgId === activeOrgId) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      const res = await setActiveOrgAction(orgId);
      if (!res.ok) {
        appToast.error(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div ref={ref} className="relative" data-testid="settings-org-switcher">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-3 rounded-xl border border-aurora-border bg-aurora-surface px-3 py-2.5 text-left shadow-sm ${focusRingAurora} hover:border-aurora-brand/40 hover:bg-aurora-surface-2 disabled:opacity-70`}
        data-testid="settings-org-switcher-trigger"
      >
        <OrgLogo name={activeOrgName} logoUrl={activeOrgLogoUrl} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-aurora-fg">{activeOrgName}</span>
          <span className="block truncate text-xs text-aurora-muted">Organizacao ativa</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-aurora-muted transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label="Trocar organizacao"
          className="absolute left-0 right-0 z-20 mt-2 max-h-64 overflow-y-auto rounded-xl border border-aurora-border bg-aurora-surface py-1 shadow-lg"
          data-testid="settings-org-switcher-menu"
        >
          {orgs.map((org) => {
            const selected = org.orgId === activeOrgId;
            return (
              <li key={org.orgId} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => switchOrg(org.orgId)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-aurora-surface-2 ${selected ? "bg-aurora-brand-muted/40" : ""}`}
                  data-testid={`settings-org-option-${org.orgId}`}
                >
                  <OrgLogo name={org.name} logoUrl={org.logoUrl} size="xs" />
                  <span className="min-w-0 flex-1 truncate font-medium text-aurora-fg">{org.name}</span>
                  {selected ? <Check className="h-4 w-4 shrink-0 text-aurora-brand" aria-hidden /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
