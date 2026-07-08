"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { safeInternalPath } from "@/lib/safe-internal-path";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Props = {
  className?: string;
  /** Apos sair, redireciona para /login?next=... */
  loginNext?: string;
  /** Apos sair, redireciona direto para este path (ex.: /signup?next=...) */
  redirectTo?: string;
  label?: string;
  pendingLabel?: string;
  iconOnly?: boolean;
  confirmBeforeSignOut?: boolean;
};

export function SignOutButton({
  className,
  loginNext,
  redirectTo,
  label = "Sair",
  pendingLabel = "Saindo...",
  iconOnly = false,
  confirmBeforeSignOut = false,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

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

  function onClick() {
    if (confirmBeforeSignOut) {
      setConfirmOpen(true);
      return;
    }
    handleSignOut();
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-label="Sair"
        title={iconOnly ? "Sair" : undefined}
        className={className}
        data-testid="sign-out-button"
      >
        {pending ? (
          iconOnly ? <span className="sr-only">{pendingLabel}</span> : pendingLabel
        ) : iconOnly ? (
          <LogOut className="mx-auto h-4 w-4" aria-hidden />
        ) : (
          label
        )}
      </button>
      {confirmBeforeSignOut ? (
        <ConfirmDialog
          open={confirmOpen}
          title="Sair da conta?"
          message="Voce precisara entrar novamente para acessar o Planner."
          confirmLabel="Sair"
          pending={pending}
          onConfirm={() => {
            setConfirmOpen(false);
            handleSignOut();
          }}
          onCancel={() => setConfirmOpen(false)}
        />
      ) : null}
    </>
  );
}
