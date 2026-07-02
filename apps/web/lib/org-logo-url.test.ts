import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { resolveOrgLogoDisplayUrl } from "./org-logo-url";

describe("resolveOrgLogoDisplayUrl", () => {
  const prev = process.env.NEXT_PUBLIC_SUPABASE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = prev;
  });

  it("rewrites supabase org-logos public URL to same-origin proxy", () => {
    expect(
      resolveOrgLogoDisplayUrl(
        "http://127.0.0.1:54321/storage/v1/object/public/org-logos/22222222-2222-2222-2222-222222222222/logo.png",
      ),
    ).toBe("/api/org-logos/22222222-2222-2222-2222-222222222222/logo.png");
  });

  it("keeps external URLs unchanged", () => {
    const cloudinary = "https://res.cloudinary.com/demo/image/upload/logo.png";
    expect(resolveOrgLogoDisplayUrl(cloudinary)).toBe(cloudinary);
  });

  it("returns null for empty input", () => {
    expect(resolveOrgLogoDisplayUrl(null)).toBeNull();
    expect(resolveOrgLogoDisplayUrl("  ")).toBeNull();
  });
});
