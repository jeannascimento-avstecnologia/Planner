import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { acceptOrgInviteByToken } from "@/lib/accept-org-invite";
import { createClient } from "@/lib/supabase/server";
import { resolveOrgInvitation } from "@/lib/resolve-org-invitation";
import { normalizeAuthEmail } from "@/lib/normalize-auth-email";
import { authBtnSecondary, authLinkClass, btnPrimary } from "@/lib/ui-classes";
import { AuthLayoutShell } from "@/components/auth/auth-layout-shell";
import { SignOutButton } from "@/components/shell/sign-out-button";

function mapInviteError(message: string): string {
  if (message.includes("not authenticated")) {
    return "Faca login com o email convidado para aceitar o convite.";
  }
  if (message.includes("email mismatch")) {
    return "__invite_session_error__";
  }
  if (message.includes("invalid or expired")) {
    return "Convite invalido ou expirado. Peca um novo convite.";
  }
  return "Nao foi possivel aceitar o convite.";
}

type InviteCardProps = {
  title: string;
  children: ReactNode;
};

function InviteCard({ title, children }: InviteCardProps) {
  return (
    <AuthLayoutShell>
      <div className="space-y-4 text-center">
        <h1 className="text-lg font-semibold">{title}</h1>
        {children}
      </div>
    </AuthLayoutShell>
  );
}

function InviteSessionError({
  inviteNext,
  sessionEmail,
  inviteEmail,
}: {
  inviteNext: string;
  sessionEmail: string;
  inviteEmail: string;
}) {
  return (
    <InviteCard title="Email diferente do convite">
      <p className="text-sm text-aurora-muted">
        Este convite foi enviado para <strong className="text-aurora-fg">{inviteEmail || "outro email"}</strong>, mas
        voce esta logado como <strong className="text-aurora-fg">{sessionEmail || "conta desconhecida"}</strong>.
      </p>
      <p className="text-sm text-aurora-muted">Saia e entre com a conta convidada para aceitar.</p>
      <div className="flex flex-col gap-2">
        <SignOutButton
          loginNext={inviteNext}
          className={`w-full ${btnPrimary}`}
          label="Entrar com outra conta"
        />
        <Link href="/boards" className={`inline-block w-full ${authBtnSecondary}`}>
          Voltar ao inicio
        </Link>
      </div>
    </InviteCard>
  );
}

export default async function OrgInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <InviteCard title="Aceitar convite">
        <p className="text-sm text-aurora-muted">Convite invalido.</p>
      </InviteCard>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const inviteNext = `/invite/org?token=${encodeURIComponent(token)}`;
  const resolved = await resolveOrgInvitation(token);
  const sessionEmail = user?.email ? normalizeAuthEmail(user.email) : "";
  const inviteEmail = resolved?.email ? normalizeAuthEmail(resolved.email) : "";

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(inviteNext)}`);
  }

  if (resolved?.status === "accepted" && resolved.orgId) {
    const { data: existingMember } = await supabase
      .from("memberships")
      .select("org_id")
      .eq("org_id", resolved.orgId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingMember) {
      redirect("/boards");
    }

    return (
      <InviteCard title="Aceitar convite">
        <p className="text-sm text-aurora-muted">
          Este convite ja foi utilizado. Entre com a conta que aceitou o convite ou peca um novo convite.
        </p>
        <SignOutButton loginNext={inviteNext} className={`w-full ${btnPrimary}`} label="Entrar com outra conta" />
      </InviteCard>
    );
  }

  if (resolved?.status === "expired" || resolved?.status === "not_found" || !resolved) {
    return (
      <InviteCard title="Aceitar convite">
        <p className="text-sm text-aurora-muted">Convite invalido ou expirado. Peca um novo convite.</p>
        <SignOutButton loginNext={inviteNext} className={`w-full ${btnPrimary}`} label="Entrar com outra conta" />
      </InviteCard>
    );
  }

  if (sessionEmail && inviteEmail && sessionEmail !== inviteEmail) {
    return (
      <InviteSessionError inviteNext={inviteNext} sessionEmail={sessionEmail} inviteEmail={inviteEmail} />
    );
  }

  const result = await acceptOrgInviteByToken(token);

  if (result.orgId) {
    redirect("/boards");
  }

  const errorText = mapInviteError(result.error ?? "Nao foi possivel aceitar o convite.");

  if (errorText === "__invite_session_error__") {
    return (
      <InviteSessionError inviteNext={inviteNext} sessionEmail={sessionEmail} inviteEmail={inviteEmail} />
    );
  }

  return (
    <InviteCard title="Aceitar convite">
      <p className="text-sm text-aurora-muted">{errorText}</p>
      <div className="flex flex-col gap-2">
        <SignOutButton loginNext={inviteNext} className={`w-full ${btnPrimary}`} label="Entrar com outra conta" />
        <SignOutButton
          redirectTo={`/signup?next=${encodeURIComponent(inviteNext)}`}
          className={authLinkClass + " text-sm"}
          label="Criar conta com email convidado"
          pendingLabel="Abrindo cadastro..."
        />
      </div>
    </InviteCard>
  );
}
