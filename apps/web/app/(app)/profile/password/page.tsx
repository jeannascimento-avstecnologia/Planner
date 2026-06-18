import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChangePasswordForm } from "./change-password-form";

export default async function ChangePasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const hasPasswordProvider =
    user.app_metadata?.provider === "email" ||
    (user.identities ?? []).some((i) => i.provider === "email");

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-white">Mudar senha</h1>
        <p className="text-sm text-white">Confirme a senha atual e defina a nova.</p>
      </header>
      <ChangePasswordForm hasPasswordProvider={hasPasswordProvider} />
    </div>
  );
}
