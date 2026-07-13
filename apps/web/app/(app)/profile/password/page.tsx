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

  const oauthProviderLabel = (() => {
    const providers = new Set(
      (user.identities ?? []).map((i) => i.provider).filter((p) => p !== "email"),
    );
    if (user.app_metadata?.provider && user.app_metadata.provider !== "email") {
      providers.add(user.app_metadata.provider);
    }
    if (providers.has("azure")) return "Microsoft";
    if (providers.has("google")) return "Google";
    return null;
  })();

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-white">Mudar senha</h1>
        <p className="text-sm text-white">Confirme a senha atual e defina a nova.</p>
      </header>
      <ChangePasswordForm
        hasPasswordProvider={hasPasswordProvider}
        oauthProviderLabel={oauthProviderLabel}
      />
    </div>
  );
}
