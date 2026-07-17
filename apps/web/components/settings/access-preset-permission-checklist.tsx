"use client";

import {
  BOARD_PERMISSION_LABELS,
  PERMISSION_GROUPS,
  applyPermissionImplies,
  clearGroupCodes,
  codesEqualSet,
  selectAllGroupCodes,
  systemShortcutCodes,
  type PermissionGroupId,
} from "@/lib/access-presets";
import type { BoardCeilingPermissionCode, BoardMemberRole } from "@nextgen/contracts";

type Props = {
  codes: string[];
  onChange: (codes: BoardCeilingPermissionCode[]) => void;
  disabled?: boolean;
};

const SHORTCUTS: Array<{ role: BoardMemberRole; label: string }> = [
  { role: "viewer", label: "Visualizador" },
  { role: "admin", label: "Editor" },
  { role: "manager", label: "Administrador" },
];

export function AccessPresetPermissionChecklist({ codes, onChange, disabled = false }: Props) {
  const selected = new Set(codes);

  function setCodesRaw(next: string[]) {
    const implied = [...applyPermissionImplies(new Set(next))].filter(
      (c): c is BoardCeilingPermissionCode => c.startsWith("board."),
    );
    onChange(implied);
  }

  function toggle(code: BoardCeilingPermissionCode) {
    if (disabled) return;
    if (code === "board.view" && selected.has(code) && selected.size > 1) {
      // view sozinho so pode limpar se for o unico; senao implies re-adiciona
      return;
    }
    const next = new Set(selected);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setCodesRaw([...next]);
  }

  function onSelectAll(groupId: PermissionGroupId, groupCodes: readonly BoardCeilingPermissionCode[]) {
    if (disabled) return;
    const allOn = groupCodes.every((c) => selected.has(c));
    if (allOn) {
      setCodesRaw(clearGroupCodes(codes, groupCodes));
    } else {
      setCodesRaw(selectAllGroupCodes(codes, groupCodes));
    }
  }

  function applyShortcut(role: BoardMemberRole) {
    if (disabled) return;
    onChange([...systemShortcutCodes(role)]);
  }

  return (
    <div className="space-y-5" data-testid="access-preset-checklist">
      <div className="space-y-2">
        <p className="text-xs font-medium text-aurora-fg">Atalhos</p>
        <p className="text-xs text-aurora-muted">Preenche varios grupos de uma vez.</p>
        <div className="flex flex-wrap gap-2">
          {SHORTCUTS.map(({ role, label }) => {
            const active = codesEqualSet(selected, [...systemShortcutCodes(role)]);
            return (
              <button
                key={role}
                type="button"
                disabled={disabled}
                onClick={() => applyShortcut(role)}
                data-testid={`preset-shortcut-${role}`}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 ${
                  active
                    ? "border-aurora-accent bg-aurora-accent-muted/40 text-aurora-fg"
                    : "border-aurora-border text-aurora-muted hover:border-aurora-accent hover:text-aurora-fg"
                } disabled:opacity-50`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {PERMISSION_GROUPS.map((group) => {
        const marked = group.codes.filter((c) => selected.has(c)).length;
        const total = group.codes.length;
        const allOn = marked === total && total > 0;
        return (
          <fieldset
            key={group.id}
            className="space-y-1 border-b border-aurora-border pb-4 last:border-b-0"
            data-testid={`preset-group-${group.id}`}
          >
            <legend className="text-sm font-semibold text-aurora-fg">{group.label}</legend>
            <p className="text-xs text-aurora-muted">
              {marked} de {total}
            </p>
            <div className="mt-1 space-y-0.5">
              {group.codes.map((code) => (
                <label
                  key={code}
                  className="flex min-h-11 cursor-pointer items-center gap-2 py-1.5 text-sm text-aurora-fg focus-within:outline-none"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-aurora-border text-aurora-accent focus-visible:ring-2 focus-visible:ring-aurora-accent"
                    checked={selected.has(code)}
                    disabled={disabled}
                    onChange={() => toggle(code)}
                    data-testid={`preset-perm-${code}`}
                  />
                  <span>{BOARD_PERMISSION_LABELS[code]}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelectAll(group.id, group.codes)}
                aria-pressed={allOn}
                data-testid={`preset-group-select-all-${group.id}`}
                className="min-w-[7.5rem] text-right text-xs font-medium tabular-nums text-aurora-accent transition-colors duration-150 hover:underline disabled:opacity-50"
              >
                {allOn ? "Limpar" : "Selecionar tudo"}
              </button>
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
