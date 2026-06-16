import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, backup_email, phone, locale")
    .eq("id", user.id)
    .single();

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-aurora-fg">Perfil</h1>
        <p className="text-sm text-aurora-muted">Gerencie suas informacoes pessoais.</p>
      </header>

      <ProfileForm
        email={user.email ?? ""}
        initial={{
          fullName: profile?.full_name ?? "",
          avatarUrl: profile?.avatar_url ?? "",
          backupEmail: profile?.backup_email ?? "",
          phone: profile?.phone ?? "",
          locale: profile?.locale ?? "pt-BR",
        }}
        cloudName={cloudName}
      />
    </div>
  );
}
