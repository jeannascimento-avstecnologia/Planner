export const ORG_ROLE_LABELS: Record<string, string> = {
  owner: "Proprietario",
  admin: "Administrador",
  viewer: "Visualizador",
  manager: "Gerente",
};

export function orgRoleLabel(role: string): string {
  return ORG_ROLE_LABELS[role] ?? role;
}

export function isOrgOwnerRole(role?: string | null): boolean {
  return role === "owner";
}

export function isOrgManagerRole(role?: string | null): boolean {
  return role === "manager";
}

/** Owner ou Administrador: convites, papeis, remover membros, mover projetos entre orgs. */
export function canManageOrgMembers(role?: string | null): boolean {
  return role === "owner" || role === "admin";
}

/** Apenas proprietario: logo, nome/slug, excluir org, multi-owner, transferencia. */
export function canManageOrgIdentity(role?: string | null): boolean {
  return role === "owner";
}

/** Apenas proprietario: CRUD de presets de acesso (niveis custom). */
export function canManageAccessPresets(role?: string | null): boolean {
  return role === "owner";
}

/** @deprecated Use canManageOrgMembers ou canManageOrgIdentity. */
export function canManageOrg(role?: string | null): boolean {
  return canManageOrgMembers(role);
}

export function isOrgAdminRole(role?: string | null): boolean {
  return role === "admin" || role === "owner";
}
