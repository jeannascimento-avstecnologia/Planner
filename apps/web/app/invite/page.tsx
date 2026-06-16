import { redirect } from "next/navigation";
import Link from "next/link";
import { acceptInvite } from "@/app/(app)/boards/[boardId]/actions";
import { btnPrimary } from "@/lib/ui-classes";

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <p className="text-aurora-muted">Convite invalido.</p>
      </main>
    );
  }

  const result = await acceptInvite(token);
  if (result.boardId) {
    redirect(`/boards/${result.boardId}`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="max-w-sm rounded-2xl border border-aurora-border bg-aurora-surface p-8 text-center">
        <h1 className="mb-2 text-lg font-semibold">Aceitar convite</h1>
        <p className="mb-4 text-sm text-aurora-muted">
          {result.error ?? "Faca login com o email convidado e tente novamente."}
        </p>
        <Link href="/login" className={btnPrimary + " inline-block"}>
          Ir para login
        </Link>
      </div>
    </main>
  );
}
