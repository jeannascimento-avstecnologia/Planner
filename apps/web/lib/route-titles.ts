/** Titulo contextual exibido na top bar por rota (exceto board detail e /boards com pill). */
export function getRouteTitle(pathname: string): string {
  if (pathname === "/boards") return "Projetos";
  if (pathname.startsWith("/boards/")) return "";
  if (pathname === "/calendar") return "Calendario";
  if (pathname === "/profile") return "Perfil";
  return "AVS Flow";
}
