import { describe, expect, it } from "vitest";

import { calcDough, type DoughInputs } from "@/lib/dough";
import { fullSheetText, instructionsText } from "@/lib/recipe";

const inputs: DoughInputs = {
  balls: 4,
  ballWeightG: 280,
  hydrationPct: 65,
  usePoolish: true,
  poolishMode: "fixed",
  poolishPercent: 0,
  poolishFlourFixedG: 300,
  poolishHydrationPct: 100,
  yeastG: 3,
  yeastKind: "dry",
};

describe("Küchenzettel", () => {
  it("listet Poolish, Hauptteig und Belag", () => {
    const text = fullSheetText(calcDough(inputs), 4, 280);

    expect(text).toContain("PIZZATEIG REZEPT");
    expect(text).toContain("Teiglinge: 4 × 280 g = 1120 g");
    expect(text).toContain("Hydration: 65%");
    expect(text).toContain("POOLISH (100%)");
    expect(text).toContain("Trockengerm");
    expect(text).toContain("NEAPOLITANISCH");
  });

  it("beschreibt ohne Poolish den direkten Ansatz", () => {
    const r = calcDough({ ...inputs, usePoolish: false });
    const text = instructionsText(r, 4, 280);

    expect(text).toContain("POOLISH: aus");
    expect(text).not.toContain("Poolish in Maschine");
    expect(text).toContain("Germ auflösen");
  });

  it("übernimmt die Germ-Art in die Beschriftung", () => {
    const text = fullSheetText(
      calcDough({ ...inputs, yeastKind: "fresh" }),
      4,
      280,
    );

    expect(text).toContain("Frischgerm");
  });
});
