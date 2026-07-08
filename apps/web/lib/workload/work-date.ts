/** Normaliza work_date vindo do Postgres/Supabase para YYYY-MM-DD. */
export function normalizeWorkDateIso(value: string): string {
  return value.slice(0, 10);
}
