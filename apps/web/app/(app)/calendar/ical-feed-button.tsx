"use client";

import { useState, useTransition } from "react";
import { createIcalFeedToken } from "@/app/(app)/boards/[boardId]/actions";
import { btnSecondary } from "@/lib/ui-classes";

export function IcalFeedButton() {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        className={btnSecondary}
        onClick={() =>
          startTransition(async () => {
            const res = await createIcalFeedToken();
            if (res.error) setError(res.error);
            else setUrl(res.url ?? null);
          })
        }
      >
        {pending ? "Gerando..." : "Gerar link iCal"}
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {url ? <p className="max-w-xs break-all text-xs text-aurora-muted">{url}</p> : null}
    </div>
  );
}
