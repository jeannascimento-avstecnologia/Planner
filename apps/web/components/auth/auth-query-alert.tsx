"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

const CALLBACK_ERROR = "Nao foi possivel concluir o login com Google. Tente novamente.";

export function AuthQueryAlert() {
  const searchParams = useSearchParams();
  const message = useMemo(() => {
    const error = searchParams.get("error");
    if (!error) return null;
    if (error === "callback") return CALLBACK_ERROR;
    return decodeURIComponent(error);
  }, [searchParams]);

  if (!message) return null;
  return <p className="text-sm text-red-600">{message}</p>;
}
