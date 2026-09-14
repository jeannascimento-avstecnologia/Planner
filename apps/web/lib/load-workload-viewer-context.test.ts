import { describe, expect, it } from "vitest";
import { formatWorkloadContextBadge } from "./load-workload-viewer-context";

describe("formatWorkloadContextBadge", () => {
  it("omite o nome da org (fica no bloco do switcher)", () => {
    expect(
      formatWorkloadContextBadge({
        orgName: "Acme Inc",
        orgRoleLabel: "Proprietario",
        departmentNames: [],
      }),
    ).toBe("Proprietario");
  });

  it("anexa departamentos", () => {
    expect(
      formatWorkloadContextBadge({
        orgName: "Acme Inc",
        orgRoleLabel: "Gerente",
        departmentNames: ["Eng", "Ops"],
      }),
    ).toBe("Gerente · Dept. Eng, Ops");
  });
});
