"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import type { CardPermissionField, FieldAccess } from "@nextgen/contracts";
import { CARD_PERMISSION_FIELDS } from "@nextgen/contracts";
import { setUserFieldPermission } from "@/app/(app)/settings/permissions/actions";
import {
  cardFieldLabel,
  fieldAccessLabel,
  fieldAccessOptionLabel,
  membershipRoleLabel,
} from "@/lib/field-permission-labels";
import { resolveRoleFieldAccess } from "@/lib/field-permissions";
import { btnPrimary, dataPanelClass, inputClassSm } from "@/lib/ui-classes";

type MemberOption = {
  userId: string;
  name: string;
  role: string;
};

type Props = {
  orgId: string;
  members: MemberOption[];
  selectedUserId: string;
  roleRules: Partial<Record<CardPermissionField, FieldAccess>>;
  userOverrides: Partial<Record<CardPermissionField, FieldAccess>>;
};

const ACCESS_OPTIONS = ["default", "read", "write", "hidden"] as const;

export function UserPermissionsEditor({
  orgId,
  members,
  selectedUserId,
  roleRules,
  userOverrides,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const selectedMember = members.find((m) => m.userId === selectedUserId) ?? members[0];

  function onUserChange(userId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("user", userId);
    router.push(`/settings/permissions?${params.toString()}`);
  }

  function onAccessChange(field: CardPermissionField, value: (typeof ACCESS_OPTIONS)[number]) {
    startTransition(async () => {
      const result = await setUserFieldPermission(orgId, selectedMember.userId, field, value);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Permissao atualizada.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4" data-testid="user-permissions-editor">
      <div className={`${dataPanelClass} flex flex-col gap-4 p-4 md:flex-row md:items-end md:justify-between`}>
        <div className="flex flex-col gap-1.5 md:min-w-[280px]">
          <label htmlFor="permissions-user-select" className="text-xs font-medium text-aurora-fg">
            Membro
          </label>
          <select
            id="permissions-user-select"
            className={inputClassSm}
            value={selectedMember?.userId ?? ""}
            onChange={(e) => onUserChange(e.target.value)}
            data-testid="permissions-user-select"
          >
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name} ({membershipRoleLabel(m.role)})
              </option>
            ))}
          </select>
        </div>
        {selectedMember ? (
          <p className="text-sm text-aurora-muted">
            Papel na org:{" "}
            <span className="font-medium text-aurora-fg">{membershipRoleLabel(selectedMember.role)}</span>
            . Valores em &quot;Padrao do papel&quot; seguem as regras desse papel.
          </p>
        ) : null}
      </div>

      <div className={`${dataPanelClass} overflow-x-auto`}>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-aurora-surface-2 text-xs uppercase tracking-wide text-aurora-muted">
            <tr>
              <th className="px-4 py-3">Campo do card</th>
              <th className="px-4 py-3">Permissao personalizada</th>
              <th className="px-4 py-3">Efetiva</th>
            </tr>
          </thead>
          <tbody>
            {CARD_PERMISSION_FIELDS.map((field) => {
              const override = userOverrides[field];
              const roleDefault = resolveRoleFieldAccess(roleRules, field);
              const effective = override ?? roleDefault;
              const selectValue = override ?? "default";

              return (
                <tr key={field} className="border-t border-aurora-border">
                  <td className="px-4 py-3">
                    <span className="font-medium text-aurora-fg">{cardFieldLabel(field)}</span>
                    <span className="mt-0.5 block font-mono text-[11px] text-aurora-muted">{field}</span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className={`${inputClassSm} max-w-[220px]`}
                      value={selectValue}
                      disabled={pending || !selectedMember}
                      onChange={(e) =>
                        onAccessChange(field, e.target.value as (typeof ACCESS_OPTIONS)[number])
                      }
                      data-testid={`permissions-field-${field}`}
                      aria-label={`Permissao de ${cardFieldLabel(field)}`}
                    >
                      {ACCESS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt === "default"
                            ? `${fieldAccessOptionLabel(opt)} (${fieldAccessLabel(roleDefault)})`
                            : fieldAccessOptionLabel(opt)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        effective === "write"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : effective === "read"
                            ? "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300"
                            : effective === "hidden"
                              ? "bg-aurora-surface-2 text-aurora-muted"
                              : "bg-aurora-surface-2 text-aurora-muted"
                      }`}
                    >
                      {fieldAccessLabel(effective)}
                      {override ? "" : " (papel)"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pending ? (
        <p className="text-xs text-aurora-muted" data-testid="permissions-saving">
          Salvando...
        </p>
      ) : null}
    </div>
  );
}
