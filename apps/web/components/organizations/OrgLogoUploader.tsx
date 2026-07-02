"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2 } from "lucide-react";
import {
  updateOrgLogoAction,
  uploadOrgLogoFileAction,
} from "@/app/(app)/settings/organization/actions";
import { OrgLogo } from "@/components/organizations/OrgLogo";
import { appToast } from "@/lib/toast";

type Props = {
  orgId: string;
  orgName: string;
  logoUrl: string | null;
  canManage: boolean;
};

export function OrgLogoUploader({ orgId, orgName, logoUrl, canManage }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [draftUrl, setDraftUrl] = useState(logoUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setDraftUrl(logoUrl ?? "");
  }, [logoUrl]);

  if (!canManage) {
    return (
      <div className="flex items-center gap-3">
        <OrgLogo name={orgName} logoUrl={draftUrl || null} size="lg" />
        <p className="text-sm text-aurora-muted">Apenas administradores podem alterar a logo.</p>
      </div>
    );
  }

  function saveLogo(url: string) {
    startTransition(async () => {
      const res = await updateOrgLogoAction({ orgId, logoUrl: url || null });
      if (!res.ok) {
        appToast.error(res.error);
        return;
      }
      setDraftUrl(url);
      appToast.success(url ? "Logo atualizada" : "Logo removida");
      router.refresh();
    });
  }

  async function upload(file: File) {
    setBusy(true);
    try {
      const form = new FormData();
      form.append("orgId", orgId);
      form.append("file", file);
      const res = await uploadOrgLogoFileAction(form);
      if (!res.ok) {
        appToast.error(res.error);
        return;
      }
      setDraftUrl(res.logoUrl);
      appToast.success("Logo atualizada");
      router.refresh();
    } catch (e) {
      appToast.error(e instanceof Error ? e.message : "Erro no upload.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-aurora-border bg-aurora-surface-2 p-4" data-testid="org-logo-uploader">
      <div className="flex flex-wrap items-start gap-4">
        <OrgLogo name={orgName} logoUrl={draftUrl || null} size="lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-medium text-aurora-fg">Logo da empresa</p>
          <p className="text-xs text-aurora-muted">Exibida na Home, menu de organizacoes e no topo do app.</p>
          <label
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-aurora-border bg-aurora-surface px-4 py-6 text-center transition-colors hover:border-aurora-accent/50 hover:bg-aurora-accent-muted/20"
            data-testid="org-logo-dropzone"
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              disabled={busy || pending}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
              }}
            />
            <ImagePlus className="h-8 w-8 text-aurora-muted" />
            <span className="text-sm font-medium text-aurora-fg">
              {busy ? "Enviando..." : "Clique para escolher uma imagem do seu PC"}
            </span>
            <span className="text-xs text-aurora-muted">JPG, PNG, WebP ou GIF — max. 5 MB</span>
          </label>
          {draftUrl ? (
            <button
              type="button"
              onClick={() => saveLogo("")}
              disabled={busy || pending}
              className="inline-flex items-center gap-2 rounded-md border border-aurora-danger/40 px-3 py-1.5 text-sm text-aurora-danger hover:bg-aurora-danger/10 disabled:opacity-60"
              data-testid="org-logo-remove"
            >
              <Trash2 className="h-4 w-4" />
              Remover logo
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
