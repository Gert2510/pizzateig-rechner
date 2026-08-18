import { describe, expect, it } from "vitest";

import {
  formatGram,
  formatNumberDE,
  intOr,
  numOr,
  parseNumberDE,
} from "@/lib/format";

describe("parseNumberDE", () => {
  it("akzeptiert Komma und Punkt", () => {
    expect(parseNumberDE("1,5")).toBe(1.5);
    expect(parseNumberDE("1.5")).toBe(1.5);
    expect(parseNumberDE("  300 ")).toBe(300);
  });

  it("gibt null für leere oder ungültige Eingaben", () => {
    expect(parseNumberDE("")).toBeNull();
    expect(parseNumberDE("   ")).toBeNull();
    expect(parseNumberDE("abc")).toBeNull();
    expect(parseNumberDE(null)).toBeNull();
  });

  it("erhält die 0", () => {
    expect(parseNumberDE("0")).toBe(0);
    expect(numOr("0", 300)).toBe(0);
    expect(intOr("0", 4)).toBe(0);
  });
});

describe("formatNumberDE", () => {
  it("nutzt Komma und schneidet Nullen ab", () => {
    expect(formatNumberDE(1.5)).toBe("1,5");
    expect(formatNumberDE(300)).toBe("300");
    expect(formatNumberDE(1.23456, 3)).toBe("1,235");
  });

  it("verstümmelt ganze Zahlen nicht (Regressionstest)", () => {
    expect(formatNumberDE(100, 0)).toBe("100");
    expect(formatNumberDE(1000, 1)).toBe("1000");
  });

  it("formatiert Gramm", () => {
    expect(formatGram(281.34)).toBe("281,3 g");
    expect(formatGram(300)).toBe("300 g");
  });
});
