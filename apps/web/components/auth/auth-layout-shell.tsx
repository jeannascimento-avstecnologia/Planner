import { AgifyLogo } from "@/components/shell/agify-logo";
import { ThemeToggle } from "@/components/shell/theme-provider";

type Props = {
  children: React.ReactNode;
};

export function AuthLayoutShell({ children }: Props) {
  return (
    <main className="aurora-sidebar-pattern relative flex min-h-screen flex-col items-center justify-center gap-6 p-6 pt-16">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle variant="auth" />
      </div>

      <div className="flex flex-col items-center gap-4 text-center">
        <AgifyLogo variant="auth" />
        <p className="auth-tagline max-w-xs text-balance sm:max-w-md">
          Gestao de projetos, sem friccao.
        </p>
      </div>

      <div className="auth-card w-full max-w-sm rounded-2xl border p-8">{children}</div>
    </main>
  );
}
