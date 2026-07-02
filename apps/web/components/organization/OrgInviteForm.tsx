"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Check, Copy, X } from "lucide-react";
import { z } from "zod";
import {
  inviteToOrgBatch,
  type OrgInviteBatchItemResult,
} from "@/app/(app)/settings/organization/actions";
import { btnBoardPrimary, inputClass } from "@/lib/ui-classes";
import { appToast } from "@/lib/toast";
import type { OrgMemberRole } from "@nextgen/contracts";

type PendingInvite = {
  email: string;
  role: OrgMemberRole;
};

type Props = {
  orgId: string;
  canManage?: boolean;
  multiOwnerEnabled?: boolean;
  currentUserIsOwner?: boolean;
};

const emailSchema = z.string().email();

function inviteResultMessage(r: OrgInviteBatchItemResult): string {
  if (!r.ok) return r.error ?? "Erro ao convidar.";
  if (r.emailSent) return "Convite enviado por email.";
  return r.error ?? "Convite criado — copie o link abaixo.";
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
        data-testid="org-invite-link-url"
      >
        {url}
      </a>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-md border border-aurora-border bg-aurora-surface px-2 py-1 text-xs text-aurora-fg hover:bg-aurora-surface-2"
        data-testid="org-invite-link-copy"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-aurora-success" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Link copiado!" : "Copiar link de convite"}
      </button>
    </div>
  );
}

export function OrgInviteForm({
  orgId,
  canManage = false,
  multiOwnerEnabled = false,
  currentUserIsOwner = false,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [draftEmail, setDraftEmail] = useState("");
  const [draftRole, setDraftRole] = useState<OrgMemberRole>("viewer");
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [inputError, setInputError] = useState<string | null>(null);
  const [results, setResults] = useState<OrgInviteBatchItemResult[] | null>(null);

  if (!canManage) {
    return <p className="text-xs text-aurora-muted">Apenas proprietario ou gerente pode convidar membros.</p>;
  }

  const showOwnerRole = multiOwnerEnabled && currentUserIsOwner;

  function roleSelectOptions() {
    return (
      <>
        <option value="viewer">Visualizador</option>
        <option value="admin">Administrador</option>
        <option value="manager">Gerente</option>
        {showOwnerRole ? <option value="owner">Proprietario</option> : null}
      </>
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
    setInvites((prev) => [...prev, { email, role: draftRole }]);
    setDraftEmail("");
    setDraftRole("viewer");
    setResults(null);
  }

  function removeInvite(email: string) {
    setInvites((prev) => prev.filter((i) => i.email !== email));
    setResults(null);
  }

  function updateRole(email: string, role: OrgMemberRole) {
    setInvites((prev) => prev.map((i) => (i.email === email ? { ...i, role } : i)));
    setResults(null);
  }

  function sendInvites() {
    if (invites.length === 0) return;
    setInputError(null);
    startTransition(async () => {
      const res = await inviteToOrgBatch({ orgId, invites });
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
    <section className="space-y-3 rounded-lg border border-aurora-border bg-aurora-bg p-4" data-testid="org-invite-form">
      <p className="text-sm font-semibold text-aurora-fg">Convidar por email</p>

      <div className="flex flex-wrap gap-2 sm:flex-nowrap">
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
          data-testid="org-invite-email-input"
        />
        <select
          value={draftRole}
          onChange={(e) => setDraftRole(e.target.value as OrgMemberRole)}
          className={`w-full shrink-0 sm:w-36 ${inputClass}`}
          aria-label="Papel do convite"
        >
          {roleSelectOptions()}
        </select>
        <button
          type="button"
          onClick={addInvite}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-aurora-border bg-aurora-surface px-3 text-sm font-medium text-aurora-fg hover:bg-aurora-surface-2"
          aria-label="Adicionar email"
          data-testid="org-invite-email-add"
        >
          <ArrowRight className="h-4 w-4" />
          Adicionar
        </button>
      </div>

      {inputError ? <p className="text-xs text-aurora-danger">{inputError}</p> : null}

      {invites.length > 0 ? (
        <ul className="space-y-2" data-testid="org-invite-email-list">
          {invites.map((invite) => (
            <li
              key={invite.email}
              className="flex items-center gap-2 rounded-lg border border-aurora-border bg-aurora-surface px-2 py-1.5"
            >
              <span className="min-w-0 flex-1 truncate text-sm text-aurora-fg">{invite.email}</span>
              <select
                value={invite.role}
                onChange={(e) => updateRole(invite.email, e.target.value as OrgMemberRole)}
                className="rounded border border-aurora-border bg-aurora-surface px-1.5 py-0.5 text-xs"
                aria-label={`Papel de ${invite.email}`}
              >
                {roleSelectOptions()}
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
      ) : (
        <p className="text-xs text-aurora-muted">Adicione um ou mais emails para enviar convites.</p>
      )}

      {results?.length ? (
        <ul className="space-y-1 rounded-lg border border-aurora-border bg-aurora-surface p-2 text-xs">
          {results.map((r) => (
            <li key={r.email} className={r.ok ? "text-aurora-success" : "text-aurora-danger"}>
              <span className="font-medium">{r.email}:</span> {inviteResultMessage(r)}
              {r.ok && r.inviteUrl ? <InviteLinkCopy url={r.inviteUrl} /> : null}
            </li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        onClick={sendInvites}
        disabled={pending || invites.length === 0}
        className={`w-full ${btnBoardPrimary}`}
        data-testid="org-invite-send"
      >
        {pending ? "Enviando..." : "Enviar convite"}
      </button>
    </section>
  );
}
