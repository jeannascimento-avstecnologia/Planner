import type { CardPermissionField, FieldAccess } from "@nextgen/contracts";

export function stripHiddenCardFields<T extends Record<string, unknown>>(
  card: T,
  accessMap: Partial<Record<CardPermissionField, FieldAccess>>,
): T {
  const out = { ...card };
  for (const [field, access] of Object.entries(accessMap)) {
    if (access === "hidden") delete out[field];
  }
  return out;
}

export function canWriteField(field: CardPermissionField, accessMap: Partial<Record<CardPermissionField, FieldAccess>>): boolean {
  return accessMap[field] === "write" || accessMap[field] === undefined;
}

export function buildAccessMap(
  rules: { field_name: string; access: string }[],
): Partial<Record<CardPermissionField, FieldAccess>> {
  const map: Partial<Record<CardPermissionField, FieldAccess>> = {};
  for (const r of rules) {
    map[r.field_name as CardPermissionField] = r.access as FieldAccess;
  }
  return map;
}

export function resolveRoleFieldAccess(
  roleRules: Partial<Record<CardPermissionField, FieldAccess>>,
  field: CardPermissionField,
): FieldAccess {
  return roleRules[field] ?? "write";
}

export function resolveEffectiveFieldAccess(
  roleRules: Partial<Record<CardPermissionField, FieldAccess>>,
  userOverrides: Partial<Record<CardPermissionField, FieldAccess>>,
  field: CardPermissionField,
): FieldAccess {
  return userOverrides[field] ?? resolveRoleFieldAccess(roleRules, field);
}
