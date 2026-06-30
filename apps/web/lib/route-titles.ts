/** Titulo contextual exibido na top bar por rota (exceto board detail e /boards com pill). */
import { PRODUCT_NAME } from "@/lib/brand";

export function getRouteTitle(pathname: string): string {
  if (pathname === "/boards") return "Home";
  if (pathname === "/projects") return "Projetos";
  if (pathname.startsWith("/boards/")) return "";
  if (pathname === "/calendar") return "Calendario";
  if (pathname === "/profile") return "Perfil";
  return PRODUCT_NAME;
}
