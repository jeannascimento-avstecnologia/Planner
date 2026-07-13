"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { isMicrosoftLoginAvailable, MICROSOFT_LOGIN_LOCAL_MESSAGE } from "@/lib/supabase/is-local-url";

const CALLBACK_ERROR = "Nao foi possivel concluir o login social. Tente novamente.";

export function AuthQueryAlert() {
  const searchParams = useSearchParams();
  const message = useMemo(() => {
    const error = searchParams.get("error");
    if (!error) return null;
    if (error === "callback") return CALLBACK_ERROR;
    const decoded = decodeURIComponent(error);
    if (!isMicrosoftLoginAvailable() && decoded === MICROSOFT_LOGIN_LOCAL_MESSAGE) {
      return null;
    }
    return decoded;
  }, [searchParams]);
  if (!message) return null;
  return <p className="text-sm text-red-600">{message}</p>;
}
