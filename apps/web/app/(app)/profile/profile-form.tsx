"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "./actions";
import { AvatarUploader } from "@/components/profile/avatar-uploader";
import { btnPrimary, inputClass } from "@/lib/ui-classes";

type Initial = {
  fullName: string;
  avatarUrl: string;
  backupEmail: string;
  phone: string;
  locale: string;
};

export function ProfileForm({
  email,
  initial,
  cloudName,
}: {
  email: string;
  initial: Initial;
  cloudName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={(fd) => {
        setStatus("idle");
        setError(null);
        fd.set("avatarUrl", avatarUrl);
        startTransition(async () => {
          let host: string | null = null;
          try {
            host = avatarUrl ? new URL(avatarUrl).host : null;
          } catch {
            host = "invalid-url";
          }
          // #region agent log
          fetch("http://127.0.0.1:7735/ingest/ccfd0ebe-18ad-4f5a-9b22-eccef37739f9", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "c90e06" },
            body: JSON.stringify({
              sessionId: "c90e06",
              runId: "pre-fix",
              hypothesisId: "C",
              location: "profile-form.tsx:submit",
              message: "submitting profile",
              data: { host, avatarUrlLen: avatarUrl.length },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion
          const res = await updateProfile(fd);
          // #region agent log
          fetch("http://127.0.0.1:7735/ingest/ccfd0ebe-18ad-4f5a-9b22-eccef37739f9", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "c90e06" },
            body: JSON.stringify({
              sessionId: "c90e06",
              runId: "pre-fix",
              hypothesisId: "C",
              location: "profile-form.tsx:submitResult",
              message: "updateProfile result",
              data: { ok: res.ok, error: "error" in res ? res.error : null },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion
          if (res.ok) {
            setStatus("ok");
            router.refresh();
          } else {
            setStatus("error");
            setError(res.error);
          }
        });
      }}
      className="space-y-5 rounded-xl border border-aurora-border bg-aurora-surface p-6"
    >
      <AvatarUploader value={avatarUrl} onChange={setAvatarUrl} cloudName={cloudName} fullName={initial.fullName} />

      <div className="space-y-1">
        <label className="text-sm font-medium text-aurora-fg">Nome completo</label>
        <input name="fullName" defaultValue={initial.fullName} className={inputClass} />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-aurora-fg">E-mail da conta</label>
        <input value={email} disabled className={inputClass + " opacity-60"} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-aurora-fg">E-mail de backup</label>
          <input
            name="backupEmail"
            type="email"
            defaultValue={initial.backupEmail}
            placeholder="backup@empresa.com"
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-aurora-fg">Telefone</label>
          <input name="phone" defaultValue={initial.phone} placeholder="+55 ..." className={inputClass} />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-aurora-fg">Idioma preferido</label>
        <select name="locale" defaultValue={initial.locale} className={inputClass}>
          <option value="pt-BR">Portugues (Brasil)</option>
          <option value="en-US">English (US)</option>
        </select>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Salvando..." : "Salvar alteracoes"}
        </button>
        {status === "ok" ? <span className="text-sm text-aurora-success">Perfil atualizado!</span> : null}
        {status === "error" ? <span className="text-sm text-aurora-danger">{error}</span> : null}
      </div>
    </form>
  );
}
