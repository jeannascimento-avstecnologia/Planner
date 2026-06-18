import { AvsLogo } from "@/components/shell/avs-logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="aurora-sidebar-pattern flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-aurora-border bg-aurora-surface p-8 shadow-lg">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 w-48 rounded-lg bg-aurora-sidebar-bg p-2 aurora-sidebar-pattern">
            <AvsLogo variant="sidebar" />
          </div>
          <p className="text-sm text-aurora-muted">Gestao de projetos, sem friccao.</p>
        </div>
        {children}
      </div>
    </main>
  );
}
