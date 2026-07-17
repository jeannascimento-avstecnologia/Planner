"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowRight, Check, Copy, Plus, X } from "lucide-react";
import { z } from "zod";
import { inviteToBoardBatch, type InviteBatchItemResult } from "@/app/(app)/boards/[boardId]/actions";
import { listAccessPresetsForBoardAction } from "@/app/(app)/settings/access-presets/actions";
import { AccessPresetsManager } from "@/components/settings/access-presets-manager";
import {
  presetHelperText,
  SYSTEM_PRESET_BY_ROLE,
  type AccessPresetRow,
} from "@/lib/access-presets";
import { btnBoardPrimary, inputClass } from "@/lib/ui-classes";
import { appToast } from "@/lib/toast";
import type { BoardMemberRole } from "@nextgen/contracts";

export type PendingInvite = {
  email: string;
  role: BoardMemberRole;
  presetId: string;
};

type Props = {
  boardId: string;
  canManageMembers?: boolean;
  /** CRUD de presets: so Proprietario da org. */
  canManagePresets?: boolean;
  /** Se omitido, carrega sistema + custom da org via server action. */
  presets?: AccessPresetRow[];
};

const emailSchema = z.string().email();

const selectClass =
  "h-10 w-[10.5rem] max-w-[42%] shrink-0 rounded-lg border border-aurora-border bg-aurora-surface px-2 text-sm text-aurora-fg outline-none focus:border-aurora-accent focus:ring-2 focus:ring-aurora-accent-muted";

const FALLBACK_PRESETS: Array<{ id: string; label: string; role: BoardMemberRole; helper: string }> = [
  {
    id: SYSTEM_PRESET_BY_ROLE.viewer,
    label: "Visualizador",
    role: "viewer",
    helper: "Somente leitura.",
  },
  {
    id: SYSTEM_PRESET_BY_ROLE.admin,
    label: "Editor",
    role: "admin",
    helper: "Edita cards e colunas (sem ACL).",
  },
  {
    id: SYSTEM_PRESET_BY_ROLE.manager,
    label: "Administrador",
    role: "manager",
    helper: "Edita o projeto e gerencia membros.",
  },
];

function inviteResultMessage(r: InviteBatchItemResult): string {
  if (!r.ok) return r.error ?? "Erro ao convidar.";
  if (r.emailSent) return "Convite enviado por email. Copie o link abaixo se necessario.";
  return "Convite criado — copie o link abaixo.";
}

function InviteLinkCopy({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      appToast.success("Link de convite copiado");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="mt-2 space-y-1.5 rounded-md border border-aurora-border bg-aurora-bg p-2">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block break-all text-xs text-aurora-accent hover:underline"
        data-testid="invite-link-url"
      >
        {url}
      </a>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-md border border-aurora-border bg-aurora-surface px-2 py-1 text-xs text-aurora-fg hover:bg-aurora-surface-2"
        data-testid="invite-link-copy"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-aurora-success" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Link copiado!" : "Copiar link de convite"}
      </button>
    </div>
  );
}

export function InviteEmailsPanel({
  boardId,
  canManageMembers = false,
  canManagePresets = false,
  presets: presetsProp,
}: Props) {
  const [presets, setPresets] = useState<AccessPresetRow[] | null>(presetsProp ?? null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  function reloadPresets() {
    return listAccessPresetsForBoardAction(boardId).then((res) => {
      setOrgId(res.orgId);
      if (res.presets.length > 0) setPresets(res.presets);
      return res;
    });
  }

  useEffect(() => {
    if (presetsProp && presetsProp.length > 0) {
      setPresets(presetsProp);
    }
    let cancelled = false;
    void listAccessPresetsForBoardAction(boardId).then((res) => {
      if (cancelled) return;
      setOrgId(res.orgId);
      if (res.presets.length > 0) setPresets(res.presets);
    });
    return () => {
      cancelled = true;
    };
  }, [boardId, presetsProp]);

  const options = useMemo(() => {
    if (presets && presets.length > 0) {
      return presets.map((p) => ({
        id: p.id,
        label: p.name,
        role: p.baseRole,
        helper: p.description?.trim() || presetHelperText(p.permissionCodes),
      }));
    }
    return FALLBACK_PRESETS;
  }, [presets]);

  const defaultPreset = options.find((o) => o.role === "viewer") ?? options[0];
  const [pending, startTransition] = useTransition();
  const [draftEmail, setDraftEmail] = useState("");
  const [draftPresetId, setDraftPresetId] = useState(defaultPreset.id);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [inputError, setInputError] = useState<string | null>(null);
  const [results, setResults] = useState<InviteBatchItemResult[] | null>(null);

  useEffect(() => {
    if (!options.some((o) => o.id === draftPresetId)) {
      setDraftPresetId(defaultPreset.id);
    }
  }, [options, draftPresetId, defaultPreset.id]);

  const draftOption = options.find((o) => o.id === draftPresetId) ?? defaultPreset;

  if (!canManageMembers) {
    return (
      <p className="text-xs text-aurora-muted">
        Apenas Administrador do projeto ou admin/owner da org podem convidar.
      </p>
    );
  }

  function addInvite() {
    setInputError(null);
    const parsed = emailSchema.safeParse(draftEmail.trim());
    if (!parsed.success) {
      setInputError("Informe um email valido.");
      return;
    }
    const email = parsed.data.toLowerCase();
    if (invites.some((i) => i.email === email)) {
      setInputError("Este email ja esta na lista.");
      return;
    }
    const opt = options.find((o) => o.id === draftPresetId) ?? defaultPreset;
    setInvites((prev) => [...prev, { email, role: opt.role, presetId: opt.id }]);
    setDraftEmail("");
    setDraftPresetId(defaultPreset.id);
    setResults(null);
  }

  function removeInvite(email: string) {
    setInvites((prev) => prev.filter((i) => i.email !== email));
    setResults(null);
  }

  function updatePreset(email: string, presetId: string) {
    const opt = options.find((o) => o.id === presetId);
    if (!opt) return;
    setInvites((prev) =>
      prev.map((i) => (i.email === email ? { ...i, role: opt.role, presetId: opt.id } : i)),
    );
    setResults(null);
  }

  function sendInvites() {
    if (invites.length === 0) return;
    setInputError(null);
    startTransition(async () => {
      const res = await inviteToBoardBatch({ boardId, invites });
      if (!res.ok) {
        setInputError(res.error);
        appToast.error(res.error);
        return;
      }
      setResults(res.results);
      const failed = res.results.filter((r) => !r.ok);
      if (failed.length === 0) {
        appToast.success("Convite(s) enviado(s)");
        setInvites([]);
      } else {
        appToast.error(`${failed.length} convite(s) falharam`);
        const failedEmails = new Set(failed.map((r) => r.email));
        setInvites((prev) => prev.filter((i) => failedEmails.has(i.email)));
      }
    });
  }

  return (
    <section className="space-y-3 rounded-lg border border-aurora-border bg-aurora-bg p-4" data-testid="invite-emails-section">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-aurora-fg">Convidar por email</p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {orgId && canManagePresets ? (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1 text-aurora-accent hover:underline"
              data-testid="invite-create-preset"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo nivel
            </button>
          ) : null}
          {canManagePresets ? (
            <Link href="/settings/access-presets" className="text-aurora-muted hover:underline" data-testid="invite-manage-presets-link">
              Gerenciar presets
            </Link>
          ) : null}
        </div>
      </div>

      {createOpen && orgId && canManagePresets ? (
        <AccessPresetsManager
          orgId={orgId}
          presets={presets ?? []}
          canManage
          initialOpenCreate
          onCloseCreate={() => setCreateOpen(false)}
          onCreated={(id) => {
            void reloadPresets().then(() => {
              setDraftPresetId(id);
              setCreateOpen(false);
              appToast.success("Nivel criado e selecionado");
            });
          }}
        />
      ) : null}

      <div className="flex items-center gap-2">
        <input
          type="email"
          value={draftEmail}
          onChange={(e) => {
            setDraftEmail(e.target.value);
            setInputError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addInvite();
            }
          }}
          placeholder="email@empresa.com"
          className={`min-w-0 flex-1 ${inputClass}`}
          data-testid="invite-email-input"
        />
        <select
          value={draftPresetId}
          onChange={(e) => setDraftPresetId(e.target.value)}
          className={selectClass}
          aria-label="Nivel de acesso do convite"
          data-testid="invite-preset-select"
        >
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={addInvite}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-aurora-border bg-aurora-surface px-3 text-sm font-medium text-aurora-fg hover:bg-aurora-surface-2"
          aria-label="Adicionar email"
          data-testid="invite-email-add"
        >
          <ArrowRight className="h-4 w-4" />
          Adicionar
        </button>
      </div>
      <p className="text-xs text-aurora-muted">{draftOption.helper}</p>

      {inputError ? <p className="text-xs text-aurora-danger">{inputError}</p> : null}

      {invites.length > 0 ? (
        <ul className="space-y-2" data-testid="invite-email-list">
          {invites.map((invite) => (
            <li
              key={invite.email}
              className="flex items-center gap-2 rounded-lg border border-aurora-border bg-aurora-surface px-2 py-1.5"
            >
              <span className="min-w-0 flex-1 truncate text-sm text-aurora-fg">{invite.email}</span>
              <select
                value={invite.presetId}
                onChange={(e) => updatePreset(invite.email, e.target.value)}
                className="h-8 max-w-[9rem] shrink-0 rounded border border-aurora-border bg-aurora-surface px-1.5 text-xs"
                aria-label={`Nivel de acesso de ${invite.email}`}
              >
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeInvite(invite.email)}
                className="rounded p-1 text-aurora-muted hover:bg-aurora-surface-2 hover:text-aurora-fg"
                aria-label={`Remover ${invite.email}`}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        onClick={sendInvites}
        disabled={pending || invites.length === 0}
        className={`${btnBoardPrimary} w-full disabled:opacity-50`}
        data-testid="invite-email-send"
      >
        {pending ? "Enviando..." : "Enviar convite"}
      </button>

      {results ? (
        <ul className="space-y-2 text-xs">
          {results.map((r) => (
            <li key={r.email} className={r.ok ? "text-aurora-fg" : "text-aurora-danger"}>
              <span className="font-medium">{r.email}</span>: {inviteResultMessage(r)}
              {r.ok && r.inviteUrl ? <InviteLinkCopy url={r.inviteUrl} /> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
