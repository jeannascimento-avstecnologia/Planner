/** Titulo contextual exibido na top bar por rota (exceto board detail e /boards com pill). */
export function getRouteTitle(pathname: string): string {
  if (pathname === "/boards") return "Home";
  if (pathname === "/projects") return "Projetos";
  if (pathname.startsWith("/boards/") && pathname.endsWith("/dashboard")) return "Dashboard";
  if (pathname.startsWith("/boards/")) return "";
  if (pathname === "/calendar") return "Calendario";
  if (pathname === "/plan") return "Meu plano";
  if (pathname === "/workload") return "Carga";
  if (pathname === "/help") return "Ajuda";
  if (pathname === "/profile") return "Perfil";
  if (pathname === "/settings") return "Configuracoes";
  if (pathname.startsWith("/settings/organizations")) return "Organizacoes";
  if (pathname.startsWith("/settings/organization")) return "Organizacao";
  if (pathname.startsWith("/settings/integrations")) return "Integracoes";
  if (pathname.startsWith("/settings/audit")) return "Auditoria";
  if (pathname.startsWith("/settings/access-presets")) return "Presets de acesso";
  if (pathname.startsWith("/settings/permissions")) return "Permissoes";
  if (pathname.startsWith("/settings")) return "Configuracoes";
  return "";
}
