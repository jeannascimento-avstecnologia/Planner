"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { inputClassSm } from "@/lib/ui-classes";

type Props = {
  value: string;
  onChange: (url: string) => void;
  cloudName: string;
  fullName?: string;
};

type SignResponse = { signature: string; timestamp: number; apiKey: string; folder: string };
type UploadResponse = { secure_url: string };

export function AvatarUploader({ value, onChange, cloudName, fullName }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = (fullName || "?")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const fnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/cloudinary-sign`;
      const sigRes = await fetch(fnUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ folder: "avatars" }),
      });
      if (!sigRes.ok) throw new Error("Falha ao assinar o upload.");
      const sig = (await sigRes.json()) as SignResponse;

      const form = new FormData();
      form.append("file", file);
      form.append("api_key", sig.apiKey);
      form.append("timestamp", String(sig.timestamp));
      form.append("signature", sig.signature);
      form.append("folder", sig.folder);

      const upRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: form,
      });
      if (!upRes.ok) throw new Error("Falha no upload da imagem.");
      const data = (await upRes.json()) as UploadResponse;
      onChange(data.secure_url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro no upload.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt="Avatar"
          className="h-16 w-16 rounded-full object-cover"
        />
      ) : (
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-aurora-accent-muted text-lg font-semibold text-aurora-accent">
          {initials}
        </span>
      )}

      <div className="min-w-0 flex-1 space-y-1">
        <label className="text-sm font-medium text-aurora-fg">Foto de perfil</label>
        {cloudName ? (
          <div className="space-y-1">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-md border border-aurora-border px-3 py-1.5 text-sm text-aurora-fg hover:bg-aurora-accent-muted/40 disabled:opacity-60"
            >
              <Upload className="h-4 w-4" />
              {busy ? "Enviando..." : "Enviar imagem"}
            </button>
          </div>
        ) : (
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://.../avatar.jpg"
            className={inputClassSm}
          />
        )}
        {error ? <p className="text-xs text-aurora-danger">{error}</p> : null}
      </div>
    </div>
  );
}
