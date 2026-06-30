import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isInviteAuthNext, parseInviteTokenFromNext } from "@/lib/invite-auth";
import { peekBoardInvitation } from "@/lib/peek-board-invitation";
import { safeInternalPath } from "@/lib/safe-internal-path";
import { SignupForm } from "./signup-form";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next: nextRaw } = await searchParams;
  const next = safeInternalPath(nextRaw, "");
  const inviteMode = isInviteAuthNext(next);

  if (inviteMode) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.auth.signOut();
      redirect(nextRaw ? `/signup?next=${encodeURIComponent(next)}` : "/signup");
    }
  }

  const inviteToken = inviteMode ? parseInviteTokenFromNext(next) : null;
  const invitation = inviteToken ? await peekBoardInvitation(inviteToken) : null;

  return (
    <Suspense fallback={<div className="text-sm text-aurora-muted">Carregando...</div>}>
      <SignupForm
        next={next}
        inviteMode={inviteMode}
        invitedEmail={invitation?.email ?? null}
        boardName={invitation?.boardName ?? null}
      />
    </Suspense>
  );
}
