import { describe, expect, it } from "vitest";
import { formatHours, formatHoursLabel, parseLocaleNumber } from "./parse-number";

describe("parseLocaleNumber", () => {
  it("aceita virgula e ponto", () => {
    expect(parseLocaleNumber("8,5")).toBe(8.5);
    expect(parseLocaleNumber("8.5")).toBe(8.5);
    expect(parseLocaleNumber("40")).toBe(40);
  });

  it("rejeita vazio, cientifico e lixo", () => {
    expect(parseLocaleNumber("")).toBeNull();
    expect(parseLocaleNumber("1e3")).toBeNull();
    expect(parseLocaleNumber("abc")).toBeNull();
    expect(parseLocaleNumber("8,5,1")).toBeNull();
  });
});

describe("formatHours", () => {
  it("formata inteiro e decimal", () => {
    expect(formatHours(8)).toBe("8");
    expect(formatHours(8.5)).toBe("8,5");
    expect(formatHoursLabel(8.5)).toBe("8,5h");
    expect(formatHoursLabel(null)).toBe("");
  });
});
