import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assertBearerPresent, resolveOrgUploadFolder } from "./folder.ts";

const ORG = "11111111-1111-4111-8111-111111111111";
const CARD = "22222222-2222-4222-8222-222222222222";

Deno.test("auth gate rejects missing bearer", () => {
  assertEquals(assertBearerPresent(null).ok, false);
  assertEquals(assertBearerPresent("Basic x").ok, false);
  assertEquals(assertBearerPresent("Bearer ").ok, false);
});

Deno.test("auth gate accepts bearer token shape", () => {
  assertEquals(assertBearerPresent("Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig"), { ok: true });
});

Deno.test("rejects client-chosen folder", () => {
  const result = resolveOrgUploadFolder({ orgId: ORG, folder: "uploads" });
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.error, "folder_not_allowed");
});

Deno.test("requires orgId", () => {
  const result = resolveOrgUploadFolder({ purpose: "avatar" });
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.error, "org_id_required");
});

Deno.test("scopes avatar/logo/upload under org/{id}/…", () => {
  assertEquals(resolveOrgUploadFolder({ orgId: ORG, purpose: "avatar" }), {
    ok: true,
    folder: `org/${ORG}/avatars`,
    purpose: "avatar",
    requiresAdmin: false,
  });
  assertEquals(resolveOrgUploadFolder({ orgId: ORG, purpose: "logo" }), {
    ok: true,
    folder: `org/${ORG}/logos`,
    purpose: "logo",
    requiresAdmin: true,
  });
  assertEquals(resolveOrgUploadFolder({ orgId: ORG }), {
    ok: true,
    folder: `org/${ORG}/uploads`,
    purpose: "upload",
    requiresAdmin: false,
  });
});

Deno.test("scopes card folder", () => {
  assertEquals(resolveOrgUploadFolder({ orgId: ORG, purpose: "card", cardId: CARD }), {
    ok: true,
    folder: `org/${ORG}/card/${CARD}`,
    purpose: "card",
    requiresAdmin: false,
  });
});
