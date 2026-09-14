import { describe, expect, it } from "vitest";
import { formatPhoneBr, isValidPhone, normalizePhone } from "./phone-br";

describe("phone-br", () => {
  it("mascara celular e fixo", () => {
    expect(formatPhoneBr("11988887777")).toBe("(11) 98888-7777");
    expect(formatPhoneBr("1133334444")).toBe("(11) 3333-4444");
    expect(normalizePhone("(11) 98888-7777")).toBe("11988887777");
  });

  it("valida comprimento", () => {
    expect(isValidPhone("")).toBe(true);
    expect(isValidPhone("11988887777")).toBe(true);
    expect(isValidPhone("123")).toBe(false);
    expect(isValidPhone("foo@bar.com")).toBe(false);
  });
});
