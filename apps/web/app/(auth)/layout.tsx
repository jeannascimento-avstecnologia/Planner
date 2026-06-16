export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-aurora-bg p-4">
      <div className="w-full max-w-sm rounded-2xl border border-aurora-border bg-aurora-surface p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-aurora-fg">NextGen Planner</h1>
          <p className="text-sm text-aurora-muted">Gestao de projetos, sem friccao.</p>
        </div>
        {children}
      </div>
    </main>
  );
}
