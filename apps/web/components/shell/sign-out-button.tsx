"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { safeInternalPath } from "@/lib/safe-internal-path";

type Props = {
  className?: string;
  /** Apos sair, redireciona para /login?next=... */
  loginNext?: string;
  /** Apos sair, redireciona direto para este path (ex.: /signup?next=...) */
  redirectTo?: string;
  label?: string;
  pendingLabel?: string;
  iconOnly?: boolean;
};

export function SignOutButton({
  className,
  loginNext,
  redirectTo,
  label = "Sair",
  pendingLabel = "Saindo...",
  iconOnly = false,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push(
        redirectTo
          ? safeInternalPath(redirectTo, "/login")
          : loginNext
            ? `/login?next=${encodeURIComponent(safeInternalPath(loginNext, "/boards"))}`
            : "/login",
      );
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={pending}
      aria-label="Sair"
      title={iconOnly ? "Sair" : undefined}
      className={className}
    >
      {pending ? (
        iconOnly ? <span className="sr-only">{pendingLabel}</span> : pendingLabel
      ) : iconOnly ? (
        <LogOut className="mx-auto h-4 w-4" aria-hidden />
      ) : (
        label
      )}
    </button>
  );
}
