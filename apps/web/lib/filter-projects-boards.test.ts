import { describe, expect, it } from "vitest";
import { buildDeptFilterOptions } from "./filter-projects-boards";

describe("buildDeptFilterOptions", () => {
  it("sempre inclui Todos e Geral", () => {
    const opts = buildDeptFilterOptions([]);
    expect(opts.map((o) => o.id)).toEqual(["all", "general"]);
  });

  it("inclui departamentos da org", () => {
    const opts = buildDeptFilterOptions([
      { id: "d1", name: "Marketing" },
      { id: "d2", name: "Vendas" },
    ]);
    expect(opts).toHaveLength(4);
    expect(opts[2]).toEqual({ id: "d1", label: "Marketing" });
  });
});
