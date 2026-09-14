import { describe, expect, it } from "vitest";
import { cnpjHasInvalidChars, isValidCnpj, normalizeCnpj } from "@nextgen/contracts";
import { cnpjSubmitError, formatCnpj } from "./org-slug";

const VALID = "11.222.333/0001-81";

describe("CNPJ", () => {
  it("normaliza e formata", () => {
    expect(normalizeCnpj(VALID)).toBe("11222333000181");
    expect(formatCnpj("11222333000181")).toBe(VALID);
  });

  it("aceita CNPJ com checksum", () => {
    expect(isValidCnpj(VALID)).toBe(true);
    expect(cnpjSubmitError(VALID)).toBeNull();
    expect(cnpjSubmitError("")).toBeNull();
  });

  it("rejeita checksum, repetidos, e-mail e letras", () => {
    expect(isValidCnpj("11222333000180")).toBe(false);
    expect(isValidCnpj("00000000000000")).toBe(false);
    expect(cnpjHasInvalidChars("foo@bar.com")).toBe(true);
    expect(cnpjSubmitError("foo@bar.com")).toBe("CNPJ deve conter apenas numeros.");
    expect(cnpjSubmitError("11.222.333/0001-80")).toBe("CNPJ invalido.");
  });
});
