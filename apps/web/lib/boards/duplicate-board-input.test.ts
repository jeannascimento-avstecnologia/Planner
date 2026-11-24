import { describe, expect, it } from "vitest";
import { duplicateBoardInput } from "@nextgen/contracts";

describe("duplicateBoardInput", () => {
  it("aceita uuid", () => {
    const parsed = duplicateBoardInput.safeParse({
      boardId: "11111111-1111-1111-1111-111111111111",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejeita id invalido", () => {
    expect(duplicateBoardInput.safeParse({ boardId: "nope" }).success).toBe(false);
    expect(duplicateBoardInput.safeParse({}).success).toBe(false);
  });
});
