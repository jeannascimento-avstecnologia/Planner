import type { CreateTifluxTicketInput } from "@nextgen/contracts";

export type TifluxTicketResult = {
  ticketId: string;
  ticketNumber: string;
  raw: unknown;
};

export type TifluxOption = {
  value: string;
  label: string;
  email?: string;
};

const DEFAULT_BASE_URL = "https://api.tiflux.com/api/v2";

function baseUrl(): string {
  return (process.env.TIFLUX_API_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
}

async function tifluxFetch(path: string, token: string, init?: RequestInit): Promise<unknown> {
  const url = `${baseUrl()}${path}`;
  const method = (init?.method ?? "GET").toUpperCase();
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
  // GET/HEAD: sem Content-Type. POST FormData: boundary automatico. POST JSON: application/json.
  if (method !== "GET" && method !== "HEAD" && !isFormData) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(url, {
    ...init,
    headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
    cache: "no-store",
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    let msg =
      body && typeof body === "object" && "message" in body
        ? String((body as { message: unknown }).message)
        : `Tiflux HTTP ${res.status}`;
    if (body && typeof body === "object" && "detail" in body) {
      const detail = (body as { detail: unknown }).detail;
      if (detail && typeof detail === "object") {
        const parts = Object.entries(detail as Record<string, unknown>).flatMap(([field, errs]) =>
          Array.isArray(errs) ? errs.map((e) => `${field}: ${String(e)}`) : [`${field}: ${String(errs)}`],
        );
        if (parts.length) msg = parts.join("; ");
      }
    }
    throw new Error(msg);
  }
  return body;
}

/** Normaliza respostas de lista (array direto ou {data}/{records}). */
function extractList(body: unknown): Record<string, unknown>[] {
  if (Array.isArray(body)) return body as Record<string, unknown>[];
  if (body && typeof body === "object") {
    const obj = body as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as Record<string, unknown>[];
    for (const key of ["records", "items", "results", "clients", "desks", "users", "priorities", "tickets", "requestors"]) {
      if (Array.isArray(obj[key])) return obj[key] as Record<string, unknown>[];
    }
  }
  return [];
}

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

function encode(params: Record<string, string | number | boolean | undefined>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") usp.set(k, String(v));
  }
  const q = usp.toString();
  return q ? `?${q}` : "";
}

function page(offset = 1, limit = 30): { offset: number; limit: number } {
  return { offset, limit: Math.min(limit, 200) };
}

export async function searchTifluxClients(token: string, query?: string): Promise<TifluxOption[]> {
  const body = await tifluxFetch(
    `/clients${encode({ active: true, ...page(1, 30), ...(query ? { name: query } : {}) })}`,
    token,
  );
  return extractList(body)
    .map((c) => ({ value: str(c.id), label: str(c.name ?? c.social ?? c.id) }))
    .filter((o) => o.value);
}

export async function searchTifluxDesks(token: string, query?: string): Promise<TifluxOption[]> {
  const body = await tifluxFetch(
    `/desks${encode({ active: true, ...page(1, 50), ...(query ? { name: query } : {}) })}`,
    token,
  );
  return extractList(body)
    .map((d) => ({ value: str(d.id), label: str(d.display_name ?? d.name ?? d.id) }))
    .filter((o) => o.value);
}

export async function listTifluxDeskPriorities(token: string, deskId: number): Promise<TifluxOption[]> {
  const body = await tifluxFetch(`/desks/${deskId}/priorities${encode(page(1, 100))}`, token);
  return extractList(body)
    .map((p) => ({ value: str(p.id), label: str(p.name ?? p.id) }))
    .filter((o) => o.value);
}

export async function listTifluxServicesCatalogItems(
  token: string,
  deskId: number,
  query?: string,
): Promise<TifluxOption[]> {
  const body = await tifluxFetch(
    `/desks/${deskId}/services-catalogs-items${encode({ ...page(1, 50), ...(query ? { name: query } : {}) })}`,
    token,
  );
  return extractList(body)
    .map((i) => ({ value: str(i.id), label: str(i.name ?? i.title ?? i.id) }))
    .filter((o) => o.value);
}

/** /users nao aceita filtro por nome — busca paginada + filtro client-side. */
export async function searchTifluxUsers(token: string, query?: string): Promise<TifluxOption[]> {
  const body = await tifluxFetch(`/users${encode({ active: true, ...page(1, 200) })}`, token);
  let list = extractList(body);
  if (query?.trim()) {
    const q = query.trim().toLowerCase();
    list = list.filter((u) => {
      const name = str(u.name).toLowerCase();
      const email = str(u.email).toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }
  return list
    .slice(0, 30)
    .map((u) => ({ value: str(u.id), label: str(u.name ?? u.email ?? u.id), email: str(u.email) || undefined }))
    .filter((o) => o.value);
}

export async function searchTifluxRequestors(
  token: string,
  query?: string,
  clientId?: number,
): Promise<TifluxOption[]> {
  const params = { ...page(1, 30), ...(query ? { name: query } : {}) };
  const path = clientId
    ? `/clients/${clientId}/requestors${encode(params)}`
    : `/requestors${encode(params)}`;
  const body = await tifluxFetch(path, token);
  return extractList(body)
    .map((r) => ({
      value: str(r.id),
      label: str(r.name ?? r.email ?? r.id),
      email: str(r.email) || undefined,
    }))
    .filter((o) => o.value);
}

/** /tickets nao aceita filtro por title — filtro client-side apos desk_ids. */
export async function searchTifluxParentTickets(
  token: string,
  deskId: number,
  query?: string,
): Promise<TifluxOption[]> {
  const body = await tifluxFetch(
    `/tickets${encode({ desk_ids: deskId, is_closed: false, ...page(1, 30) })}`,
    token,
  );
  let list = extractList(body);
  if (query?.trim()) {
    const q = query.trim().toLowerCase();
    list = list.filter((t) => str(t.title ?? t.subject).toLowerCase().includes(q));
  }
  return list
    .map((t) => {
      const number = str(t.ticket_number ?? t.number ?? t.id);
      const title = str(t.title ?? t.subject ?? "");
      return { value: number, label: title ? `#${number} - ${title}` : `#${number}` };
    })
    .filter((o) => o.value);
}

type TifluxApiPayload = {
  title: string;
  description: string;
  client_id: number;
  desk_id: number;
  priority_id?: number;
  services_catalogs_item_id?: number;
  requestor_id?: number;
  requestor_name?: string;
  requestor_email?: string;
  followers?: string;
  ticket_reference_number?: number;
};

function toApiPayload(input: CreateTifluxTicketInput): TifluxApiPayload {
  return {
    title: input.title,
    description: input.description,
    client_id: input.clientId,
    desk_id: input.deskId,
    priority_id: input.priorityId,
    services_catalogs_item_id: input.servicesCatalogsItemId,
    requestor_id: input.requestorId,
    requestor_name: input.requestorName,
    requestor_email: input.requestorEmail,
    followers: input.followers && input.followers.length ? input.followers.join(",") : undefined,
    ticket_reference_number: input.parentTicketNumber,
  };
}

function toMultipartForm(payload: TifluxApiPayload): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== "") form.append(key, String(value));
  }
  return form;
}

function extractTicket(data: unknown): TifluxTicketResult {
  const obj = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const nested = obj.ticket && typeof obj.ticket === "object" ? (obj.ticket as Record<string, unknown>) : obj;
  const ticketId = str(nested.id ?? nested.ticket_id ?? "");
  const ticketNumber = str(nested.ticket_number ?? nested.number ?? nested.protocol ?? ticketId);
  if (!ticketNumber) throw new Error("Resposta Tiflux sem numero de chamado.");
  return { ticketId: ticketId || ticketNumber, ticketNumber, raw: data };
}

export async function getTifluxTicketByNumber(
  token: string,
  ticketNumber: number,
): Promise<TifluxTicketResult> {
  const body = await tifluxFetch(`/tickets/${ticketNumber}`, token);
  return extractTicket(body);
}

export async function createTifluxTicket(
  input: CreateTifluxTicketInput,
  token: string,
): Promise<TifluxTicketResult> {
  const payload = toApiPayload(input);
  const form = toMultipartForm(payload);
  const body = await tifluxFetch("/tickets", token, {
    method: "POST",
    body: form,
  });
  return extractTicket(body);
}
