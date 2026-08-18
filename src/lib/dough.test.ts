import { describe, expect, it } from "vitest";

import {
  calcDough,
  convertYeast,
  poolishLimits,
  POOLISH_HONEY_G,
  POOLISH_PCT_CAP,
  SALT_PER_WATER,
  type DoughInputs,
} from "@/lib/dough";

const base: DoughInputs = {
  balls: 4,
  ballWeightG: 280,
  hydrationPct: 65,
  usePoolish: false,
  poolishMode: "fixed",
  poolishPercent: 0,
  poolishFlourFixedG: 0,
  poolishHydrationPct: 100,
  yeastG: 3,
  yeastKind: "dry",
};

const sum = (...xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe("calcDough – Massenbilanz", () => {
  it("trifft das Zielgewicht ohne Poolish", () => {
    const r = calcDough(base);

    expect(r.totalDoughG).toBe(1120);
    expect(sum(r.flourG, r.waterG, r.saltG)).toBeCloseTo(1120, 0);
  });

  it("rechnet den Honig in die Gesamtmasse ein", () => {
    const r = calcDough({ ...base, usePoolish: true, poolishPercent: 35 });

    expect(r.poolish?.honeyG).toBe(POOLISH_HONEY_G);
    expect(sum(r.flourG, r.waterG, r.saltG, POOLISH_HONEY_G)).toBeCloseTo(
      1120,
      0,
    );
  });

  it("hält Hydration und Salzregel ein", () => {
    const r = calcDough({ ...base, hydrationPct: 70 });

    expect(r.waterG / r.flourG).toBeCloseTo(0.7, 3);
    expect(r.saltG / r.waterG).toBeCloseTo(SALT_PER_WATER, 3);
  });

  it("begrenzt Eingaben auf sinnvolle Bereiche", () => {
    const r = calcDough({
      ...base,
      balls: 999,
      ballWeightG: 10,
      hydrationPct: 200,
    });

    expect(r.totalDoughG).toBe(100 * 150);
    expect(r.waterG / r.flourG).toBeCloseTo(0.8, 3);
  });
});

describe("calcDough – Poolish", () => {
  const withPoolish: DoughInputs = {
    ...base,
    usePoolish: true,
    poolishMode: "fixed",
    poolishFlourFixedG: 300,
  };

  it("teilt Mehl und Wasser zwischen Poolish und Hauptteig auf", () => {
    const r = calcDough(withPoolish);
    const p = r.poolish!;

    expect(p.flourG).toBe(300);
    expect(p.waterG).toBe(300);
    expect(p.flourG + r.finalMix.flourG).toBeCloseTo(r.flourG, 1);
    expect(p.waterG + r.finalMix.waterG).toBeCloseTo(r.waterG, 1);
  });

  it("lässt das Salz komplett im Hauptteig", () => {
    const r = calcDough(withPoolish);

    expect(r.finalMix.saltG).toBeCloseTo(r.saltG, 3);
  });

  it("steckt die Germ in den Poolish, nicht in den Hauptteig", () => {
    const r = calcDough(withPoolish);

    expect(r.poolish?.yeastG).toBe(3);
    expect(r.finalMix.yeastG).toBe(0);
  });

  it("gibt die Germ ohne Poolish in den Hauptteig", () => {
    const r = calcDough(base);

    expect(r.poolish).toBeNull();
    expect(r.finalMix.yeastG).toBe(3);
  });

  it("rechnet den Prozent-Modus auf das Gesamtmehl um", () => {
    const r = calcDough({
      ...withPoolish,
      poolishMode: "percent",
      poolishPercent: 35,
    });

    expect(r.poolish!.flourG).toBeCloseTo(r.flourG * 0.35, 1);
  });

  it("begrenzt den Poolish, bevor das Final-Wasser negativ wird", () => {
    const r = calcDough({ ...withPoolish, poolishFlourFixedG: 5000 });

    expect(r.finalMix.waterG).toBeGreaterThanOrEqual(0);
    expect(r.poolish!.note).toMatch(/begrenzt/i);
  });

  it("meldet keinen Hinweis, solange die Menge passt", () => {
    expect(calcDough(withPoolish).poolish?.note).toBeUndefined();
  });

  it("akzeptiert 0 g Poolish-Mehl (kein Fallback auf 300)", () => {
    const r = calcDough({ ...withPoolish, poolishFlourFixedG: 0 });

    expect(r.poolish!.flourG).toBe(0);
    expect(r.finalMix.flourG).toBeCloseTo(r.flourG, 1);
  });
});

describe("poolishLimits", () => {
  it("hält 40 % vom Gesamtmehl und 30 g Rest-Wasser ein", () => {
    const l = poolishLimits(1000, 650, 100);

    expect(l.maxFlourG).toBeLessThanOrEqual(400);
    expect(650 - l.maxFlourG).toBeGreaterThanOrEqual(30);
    expect(l.maxPercent).toBeLessThanOrEqual(POOLISH_PCT_CAP);
  });

  it("berücksichtigt eine höhere Poolish-Hydration", () => {
    const a = poolishLimits(1000, 650, 100);
    const b = poolishLimits(1000, 650, 110);

    expect(b.maxFlourG).toBeLessThanOrEqual(a.maxFlourG);
  });

  it("wird bei winzigen Teigen nicht negativ", () => {
    const l = poolishLimits(90, 20, 100);

    expect(l.maxFlourG).toBe(0);
    expect(l.maxPercent).toBe(0);
  });
});

describe("convertYeast", () => {
  it("rechnet trocken → frisch mit Faktor 3", () => {
    expect(convertYeast(3, "dry", "fresh")).toBe(9);
    expect(convertYeast(9, "fresh", "dry")).toBe(3);
    expect(convertYeast(3, "dry", "dry")).toBe(3);
  });
});
