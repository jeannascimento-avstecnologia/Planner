"use client";

import { useState, useTransition } from "react";
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

function resolveSignOutTarget(loginNext?: string, redirectTo?: string): string {
  if (redirectTo) return safeInternalPath(redirectTo, "/login");
  if (loginNext) {
    return `/login?next=${encodeURIComponent(safeInternalPath(loginNext, "/boards"))}`;
  }
  return "/login";
}

export function SignOutButton({
  className,
  loginNext,
  redirectTo,
  label = "Sair",
  pendingLabel = "Saindo...",
  iconOnly = false,
  confirmBeforeSignOut = false,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleSignOut() {
    startTransition(async () => {
      const target = resolveSignOutTarget(loginNext, redirectTo);
      const supabase = createClient();
      await supabase.auth.signOut();
      try {
        await fetch("/api/auth/sign-out", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
        });
      } catch {
        // client signOut ja limpou sessao local; API complementa cookie httpOnly
      }
      window.location.assign(target);
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
