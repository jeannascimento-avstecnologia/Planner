"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { btnBoardPrimary, inputClass } from "@/lib/ui-classes";
import type { OrganizationsOverviewData, OrgOverview } from "@/lib/load-organizations-overview";
import type { CreatedOrganization } from "@/app/(app)/settings/organizations/actions";
import { CreateOrganizationDialog } from "./CreateOrganizationDialog";
import { OrganizationCard } from "./OrganizationCard";

type Props = {
  data: OrganizationsOverviewData;
};

function normalize(value: string): string {
  return value.toLowerCase().normalize("NFKD");
}

function toOverview(org: CreatedOrganization, activeOrgId: string | null): OrgOverview {
  return {
    orgId: org.orgId,
    name: org.name,
    slug: org.slug,
    logoUrl: org.logoUrl,
    role: org.role,
    isOwner: true,
    isActive: org.orgId === activeOrgId,
    canManageMembers: true,
    canManageIdentity: true,
    canManage: true,
    canMoveBoards: true,
    boards: [],
    members: [],
    pendingInvites: [],
    multiOwnerEnabled: false,
    departments: [],
  };
}

export function OrganizationsPanel({ data }: Props) {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [orgs, setOrgs] = useState(data.orgs);
  const [activeOrgId, setActiveOrgId] = useState(data.activeOrgId);

  useEffect(() => {
    setOrgs(data.orgs);
    setActiveOrgId(data.activeOrgId);
  }, [data.orgs, data.activeOrgId]);

  function handleOrgCreated(org: CreatedOrganization) {
    setSearch("");
    setActiveOrgId(org.orgId);
    setOrgs((current) => {
      if (current.some((item) => item.orgId === org.orgId)) return current;
      const next = [
        toOverview(org, org.orgId),
        ...current.map((item) => ({ ...item, isActive: false })),
      ];
      return next;
    });
  }

  const filteredOrgs = useMemo(() => {
    const q = normalize(search.trim());
    if (!q) return orgs;

    return orgs
      .map((org) => {
        const orgMatch = normalize(org.name).includes(q) || normalize(org.slug).includes(q);
        const boards = org.boards.filter((b) => normalize(b.name).includes(q));
        if (orgMatch) return org;
        if (boards.length === 0) return null;
        return { ...org, boards };
      })
      .filter((org): org is OrgOverview => org !== null);
  }, [orgs, search]);

  const adminOrgIds = orgs.filter((o) => o.canManageMembers).map((o) => o.orgId);

  return (
    <div className="space-y-6" data-testid="organizations-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-aurora-fg">Organizacoes</h1>
          <p className="text-sm text-aurora-muted">Gerencie orgs, projetos e membros</p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className={btnBoardPrimary + " inline-flex w-full items-center justify-center gap-2 sm:w-auto"}
          data-testid="create-org-button"
        >
          <Plus className="h-4 w-4" />
          Criar organizacao
        </button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-aurora-muted" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar projetos entre organizacoes..."
          className={inputClass + " pl-9"}
          data-testid="organizations-search"
        />
      </div>

      {filteredOrgs.length === 0 ? (
        <div className="rounded-xl border border-aurora-border bg-aurora-surface p-8 text-center">
          <p className="text-sm text-aurora-muted">
            {orgs.length === 0
              ? "Voce ainda nao pertence a nenhuma organizacao."
              : "Nenhum projeto corresponde a busca."}
          </p>
          {orgs.length === 0 ? (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className={btnBoardPrimary + " mt-4"}
            >
              Criar sua primeira organizacao
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrgs.map((org) => (
            <OrganizationCard
              key={org.orgId}
              org={org}
              currentUserId={data.currentUserId}
              adminOrgIds={adminOrgIds}
              allOrgs={orgs.map((o) => ({ orgId: o.orgId, name: o.name }))}
            />
          ))}
        </div>
      )}

      <CreateOrganizationDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleOrgCreated}
      />
    </div>
  );
}
