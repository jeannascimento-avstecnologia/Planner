"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AuroraDrawer } from "@/components/ui/aurora-drawer";
import { AuroraModal } from "@/components/ui/aurora-modal";
import { AccessPresetPermissionChecklist } from "@/components/settings/access-preset-permission-checklist";
import {
  applyPermissionImplies,
  type AccessPresetRow,
} from "@/lib/access-presets";
import { BOARD_CEILING_PERMISSION_CODES, type BoardCeilingPermissionCode } from "@nextgen/contracts";
import {
  createAccessPresetAction,
  deleteAccessPresetAction,
  updateAccessPresetAction,
} from "@/app/(app)/settings/access-presets/actions";
import { inputClassSm } from "@/lib/ui-classes";

const DELETE_CONFIRM_PHRASE = "excluir";

type Props = {
  orgId: string;
  presets: AccessPresetRow[];
  canManage: boolean;
  /** Abre drawer de criar ao montar (ex.: fluxo invite). */
  initialOpenCreate?: boolean;
  onCreated?: (presetId: string) => void;
  onCloseCreate?: () => void;
};

export function AccessPresetsManager({
  orgId,
  presets,
  canManage,
  initialOpenCreate = false,
  onCreated,
  onCloseCreate,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(initialOpenCreate);
  const [editing, setEditing] = useState<AccessPresetRow | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [codes, setCodes] = useState<BoardCeilingPermissionCode[]>(["board.view"]);
  const [pending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<AccessPresetRow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  const sorted = useMemo(
    () =>
      [...presets].sort((a, b) => {
        if (a.isSystem !== b.isSystem) return a.isSystem ? -1 : 1;
        return a.name.localeCompare(b.name, "pt-BR");
      }),
    [presets],
  );

  useEffect(() => {
    if (initialOpenCreate) {
      setEditing(null);
      setName("");
      setDescription("");
      setCodes(["board.view"]);
      setOpen(true);
    }
  }, [initialOpenCreate]);

  useEffect(() => {
    if (open && !editing?.isSystem) {
      const t = window.setTimeout(() => nameRef.current?.focus(), 50);
      return () => window.clearTimeout(t);
    }
  }, [open, editing]);

  function openCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setCodes(["board.view"]);
    setOpen(true);
  }

  function openEdit(preset: AccessPresetRow) {
    setEditing(preset);
    setName(preset.name);
    setDescription(preset.description ?? "");
    const fine = [...applyPermissionImplies(new Set(preset.permissionCodes))].filter(
      (c): c is BoardCeilingPermissionCode =>
        (BOARD_CEILING_PERMISSION_CODES as readonly string[]).includes(c),
    );
    setCodes(fine.length > 0 ? fine : ["board.view"]);
    setOpen(true);
  }

  function closeDrawer() {
    setOpen(false);
    onCloseCreate?.();
  }

  function save() {
    if (!canManage || editing?.isSystem) return;
    startTransition(async () => {
      const permissionCodes = codes.filter((c) =>
        (BOARD_CEILING_PERMISSION_CODES as readonly string[]).includes(c),
      );

      if (permissionCodes.length === 0) {
        toast.error("Selecione ao menos uma permissao.");
        return;
      }

      const res = editing
        ? await updateAccessPresetAction({
            id: editing.id,
            orgId,
            name,
            description: description || null,
            permissionCodes,
          })
        : await createAccessPresetAction({
            orgId,
            name,
            description: description || null,
            permissionCodes,
          });

      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(editing ? "Preset atualizado" : "Preset criado");
      if (!editing) {
        const created = res as { ok: true; id?: string };
        if (created.id) onCreated?.(created.id);
      }
      closeDrawer();
      router.refresh();
    });
  }

  function requestRemove(preset: AccessPresetRow) {
    if (!canManage || preset.isSystem) return;
    if (preset.usersUsing > 0) {
      toast.error("Preset em uso. Reatribua os membros antes.");
      return;
    }
    setDeleteConfirm("");
    setDeleteTarget(preset);
  }

  function closeDeleteModal() {
    setDeleteTarget(null);
    setDeleteConfirm("");
  }

  function confirmRemove() {
    if (!deleteTarget) return;
    if (deleteConfirm.trim().toLowerCase() !== DELETE_CONFIRM_PHRASE) {
      toast.error(`Digite "${DELETE_CONFIRM_PHRASE}" para confirmar.`);
      return;
    }
    const preset = deleteTarget;
    startTransition(async () => {
      const res = await deleteAccessPresetAction({ id: preset.id, orgId });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      closeDeleteModal();
      toast.success("Preset excluido");
      router.refresh();
    });
  }

  const deleteConfirmOk =
    deleteConfirm.trim().toLowerCase() === DELETE_CONFIRM_PHRASE;

  const showList = !initialOpenCreate;

  return (
    <div className={showList ? "space-y-4" : undefined} data-testid={showList ? "access-presets-page" : undefined}>
      {showList ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-aurora-fg">Presets de acesso</h2>
              <p className="text-sm text-aurora-muted">
                Pacotes de permissao do projeto. Sistema sao imutaveis; custom so Proprietario.
              </p>
            </div>
            {canManage ? (
              <button
                type="button"
                onClick={openCreate}
                className="rounded-lg bg-aurora-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90"
                data-testid="access-presets-new"
              >
                Novo preset
              </button>
            ) : null}
          </div>

          {sorted.length === 0 ? (
            <p className="text-sm text-aurora-muted">
              Use Administrador, Editor ou Visualizador; personalize quando precisar.
            </p>
          ) : (
            <ul className="divide-y divide-aurora-border rounded-xl border border-aurora-border">
              {sorted.map((preset) => (
                <li
                  key={preset.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3"
                  data-testid={`access-preset-row-${preset.id}`}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => openEdit(preset)}
                  >
                    <span className="block truncate font-medium text-aurora-fg">{preset.name}</span>
                    <span className="block text-xs text-aurora-muted">
                      {preset.permissionCodes.length} perm.
                      {preset.usersUsing > 0 ? ` · ${preset.usersUsing} pessoas` : ""}
                    </span>
                  </button>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                      preset.isSystem
                        ? "border-aurora-border text-aurora-muted"
                        : "border-aurora-brand/30 bg-aurora-brand-muted/40 text-aurora-brand"
                    }`}
                  >
                    {preset.isSystem ? "Sistema" : "Custom"}
                  </span>
                  {canManage && !preset.isSystem ? (
                    <button
                      type="button"
                      onClick={() => requestRemove(preset)}
                      className="text-xs text-aurora-danger hover:underline"
                      disabled={pending}
                      data-testid={`access-preset-delete-${preset.id}`}
                    >
                      Excluir
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}

      <AuroraModal
        open={deleteTarget !== null}
        onClose={closeDeleteModal}
        title="Excluir preset?"
        size="sm"
        role="alertdialog"
        showClose={false}
        zIndex={210}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeDeleteModal}
              disabled={pending}
              className="rounded-md border border-aurora-border px-3 py-1.5 text-sm text-aurora-fg hover:bg-aurora-surface-2"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmRemove}
              disabled={pending || !deleteConfirmOk}
              className="rounded-md bg-aurora-danger px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              data-testid="access-preset-delete-confirm"
            >
              {pending ? "Aguarde..." : "Excluir permanentemente"}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-aurora-muted">
            O preset{" "}
            <strong className="text-aurora-fg">{deleteTarget?.name}</strong> sera
            removido. Esta acao nao pode ser desfeita. Digite{" "}
            <strong className="text-aurora-fg">{DELETE_CONFIRM_PHRASE}</strong> para
            confirmar.
          </p>
          <input
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder={DELETE_CONFIRM_PHRASE}
            className={inputClassSm + " w-full"}
            autoComplete="off"
            data-testid="access-preset-delete-confirm-input"
          />
        </div>
      </AuroraModal>

      <AuroraDrawer
        open={open}
        onClose={closeDrawer}
        title={editing ? editing.name : "Novo nivel de acesso"}
        testId="access-preset-drawer"
        widthClass="w-full max-w-lg"
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {editing && editing.usersUsing > 0 && !editing.isSystem ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Alteracoes afetam {editing.usersUsing} pessoa(s).
              </p>
            ) : null}

            <label className="block space-y-1">
              <span className="text-xs font-medium text-aurora-fg">Nome</span>
              <input
                ref={nameRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={Boolean(editing?.isSystem) || pending}
                className="w-full rounded-lg border border-aurora-border bg-aurora-surface px-3 py-2 text-sm"
                data-testid="access-preset-name"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-aurora-fg">Descricao (opcional)</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={Boolean(editing?.isSystem) || pending}
                rows={2}
                className="w-full rounded-lg border border-aurora-border bg-aurora-surface px-3 py-2 text-sm"
              />
            </label>

            <AccessPresetPermissionChecklist
              codes={codes}
              onChange={setCodes}
              disabled={Boolean(editing?.isSystem) || pending}
            />
          </div>

          <footer className="flex shrink-0 gap-2 border-t border-aurora-border px-4 py-3">
            <button
              type="button"
              onClick={closeDrawer}
              className="rounded-lg border border-aurora-border px-3 py-2 text-sm"
            >
              Cancelar
            </button>
            {!editing?.isSystem && canManage ? (
              <button
                type="button"
                onClick={save}
                disabled={pending || !name.trim()}
                className="ml-auto rounded-lg bg-aurora-brand px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                data-testid="access-preset-save"
              >
                {pending ? "Salvando..." : "Salvar nivel"}
              </button>
            ) : null}
          </footer>
        </div>
      </AuroraDrawer>
    </div>
  );
}
