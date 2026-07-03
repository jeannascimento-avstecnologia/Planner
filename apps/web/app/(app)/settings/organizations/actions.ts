"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_ORG_COOKIE } from "@/lib/active-org";
import { slugifyOrgDisplayName, normalizeCnpj } from "@/lib/org-slug";

function slugify(value: string): string {
  const base = slugifyOrgDisplayName(value).slice(0, 40);
  return (base || "org") + "-" + Math.random().toString(36).slice(2, 6);
}

export type OrgHubActionResult = { ok: true } | { ok: false; error: string };

export type CreatedOrganization = {
  orgId: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  role: "owner";
};

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  };
}

async function assertOrgMember(orgId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nao autenticado." };

  const { data: membership } = await supabase
    .from("memberships")
    .select("org_id")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return { ok: false, error: "Organizacao invalida." };
  return { ok: true };
}

function revalidateOrgPaths() {
  revalidatePath("/boards");
  revalidatePath("/projects");
  revalidatePath("/calendar");
  revalidatePath("/settings/organizations");
  revalidatePath("/settings/organization");
}

export async function setActiveOrgAction(orgId: string): Promise<OrgHubActionResult> {
  const access = await assertOrgMember(orgId);
  if (!access.ok) return access;

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, orgId, cookieOptions());
  revalidateOrgPaths();
  return { ok: true };
}

export async function createOrganizationHubAction(input: {
  name: string;
  displayName?: string;
  cnpj?: string;
}): Promise<OrgHubActionResult & { org?: CreatedOrganization }> {
  const legalName = input.name.trim();
  const displayName = input.displayName?.trim() || legalName;
  if (!legalName) return { ok: false, error: "Nome obrigatorio." };

  const cnpjDigits = input.cnpj ? normalizeCnpj(input.cnpj) : "";
  if (cnpjDigits && cnpjDigits.length !== 14) {
    return { ok: false, error: "CNPJ invalido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nao autenticado." };

  const slug = slugify(displayName).slice(0, 48);
  const { data: org, error } = await supabase.rpc("create_organization", {
    p_name: displayName,
    p_slug: slug,
    p_legal_name: legalName,
    p_cnpj: cnpjDigits || null,
  });
  if (error || !org?.id) return { ok: false, error: "Nao foi possivel criar a organizacao." };

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, org.id, cookieOptions());
  revalidateOrgPaths();
  return {
    ok: true,
    org: {
      orgId: org.id,
      name: org.name,
      slug: org.slug,
      logoUrl: org.logo_url ?? null,
      role: "owner",
    },
  };
}

function mapMoveBoardError(message: string): string {
  if (message.includes("forbidden_source")) return "Sem permissao na organizacao de origem.";
  if (message.includes("forbidden_target")) return "Sem permissao na organizacao de destino.";
  if (message.includes("same_org")) return "O projeto ja esta nesta organizacao.";
  if (message.includes("board_not_found")) return "Projeto nao encontrado.";
  return "Nao foi possivel mover o projeto.";
}

export async function moveBoardToOrgAction(input: {
  boardId: string;
  targetOrgId: string;
}): Promise<OrgHubActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nao autenticado." };

  const { error } = await supabase.rpc("move_board_to_org", {
    p_board: input.boardId,
    p_target_org: input.targetOrgId,
  });
  if (error) return { ok: false, error: mapMoveBoardError(error.message) };

  revalidateOrgPaths();
  revalidatePath(`/boards/${input.boardId}`);
  return { ok: true };
}
