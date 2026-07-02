/** Titulo contextual exibido na top bar por rota (exceto board detail e /boards com pill). */
export function getRouteTitle(pathname: string): string {
  if (pathname === "/boards") return "Home";
  if (pathname === "/projects") return "Projetos";
  if (pathname.startsWith("/boards/")) return "";
  if (pathname === "/calendar") return "Calendario";
  if (pathname === "/profile") return "Perfil";
  if (pathname.startsWith("/settings/organizations")) return "Organizacoes";
  if (pathname.startsWith("/settings/organization")) return "Organizacao";
  if (pathname.startsWith("/settings")) return "Configuracoes";
  return "";
}
