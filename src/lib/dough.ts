/**
 * Rezept-Modell für neapolitanischen Pizzateig.
 *
 * Massenbilanz (alles in Gramm, 1 ml Wasser ≈ 1 g):
 *
 *   Gesamtteig = Mehl + Wasser + Salz + Honig
 *   Wasser     = Hydration × Mehl
 *   Salz       = 45 g je 1000 ml Wasser
 *
 * Daraus folgt für das Mehl:
 *
 *   Mehl = (Gesamtteig − Honig) / (1 + Hydration × (1 + Salzfaktor))
 *
 * Germ bleibt bewusst außerhalb der Bilanz: die Menge liegt unter 0,5 %
 * des Teiggewichts und wird in Rezepten üblicherweise nicht mitgerechnet.
 */

export type PoolishMode = "percent" | "fixed";

/** Trockengerm ↔ Frischgerm (1 g trocken ≈ 3 g frisch). */
export type YeastKind = "dry" | "fresh";

/** Salz: 45 g pro 1000 ml Wasser. */
export const SALT_PER_WATER = 45 / 1000;

/** Honig im Poolish – fixe Menge, zählt zur Gesamtmasse. */
export const POOLISH_HONEY_G = 5;

/** Umrechnungsfaktor Trockengerm → Frischgerm. */
export const YEAST_DRY_TO_FRESH = 3;

export const LIMITS = {
  balls: { min: 1, max: 100 },
  ballWeightG: { min: 150, max: 450 },
  hydrationPct: { min: 50, max: 80 },
  poolishHydrationPct: { min: 60, max: 130 },
  yeastG: { min: 0, max: 100 },
} as const;

/** Empfohlener Poolish-Anteil am Gesamtmehl (neapolitanisch). */
export const POOLISH_PCT_RECOMMENDED = 35;

/** Harte Obergrenze für den Poolish-Anteil am Gesamtmehl. */
export const POOLISH_PCT_CAP = 40;

/** So viel Wasser muss im Hauptteig übrig bleiben, um kneten zu können. */
export const MIN_FINAL_WATER_G = 30;

export type DoughInputs = {
  balls: number;
  ballWeightG: number;
  hydrationPct: number;

  usePoolish: boolean;
  poolishMode: PoolishMode;
  /** Anteil am Gesamtmehl in Prozent (Modus "percent"). */
  poolishPercent: number;
  /** Absolute Mehlmenge im Poolish (Modus "fixed"). */
  poolishFlourFixedG: number;
  poolishHydrationPct: number;

  /** Germ in g – im Poolish, wenn dieser aktiv ist, sonst im Hauptteig. */
  yeastG: number;
  yeastKind: YeastKind;
};

export type DoughPoolish = {
  flourG: number;
  waterG: number;
  yeastG: number;
  honeyG: number;
  hydrationPct: number;
  /** Hinweis, falls der Poolish begrenzt werden musste. */
  note?: string;
};

export type DoughResult = {
  totalDoughG: number;
  flourG: number;
  waterG: number;
  saltG: number;
  saltRule: string;
  yeastKind: YeastKind;

  poolish: DoughPoolish | null;

  finalMix: {
    flourG: number;
    waterG: number;
    saltG: number;
    /** Germ im Hauptteig – nur ohne Poolish > 0. */
    yeastG: number;
    note?: string;
  };
};

/** Praktische und physikalische Obergrenzen für die Poolish-Mehlmenge. */
export type PoolishLimits = {
  /** Maximum, ab dem das Wasser im Hauptteig negativ würde. */
  hardMaxFlourG: number;
  /** Empfohlenes Maximum: ≤ {@link POOLISH_PCT_CAP} % und Rest-Wasser ≥ {@link MIN_FINAL_WATER_G} g. */
  maxFlourG: number;
  /** {@link maxFlourG} als Anteil am Gesamtmehl. */
  maxPercent: number;
};

export function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

export function clamp(x: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, x));
}

/** Rechnet eine Germ-Menge zwischen Trocken- und Frischgerm um. */
export function convertYeast(
  g: number,
  from: YeastKind,
  to: YeastKind,
): number {
  if (from === to) return g;
  return to === "fresh" ? g * YEAST_DRY_TO_FRESH : g / YEAST_DRY_TO_FRESH;
}

export function poolishLimits(
  totalFlourG: number,
  totalWaterG: number,
  poolishHydrationPct: number,
): PoolishLimits {
  const hyd =
    clamp(
      poolishHydrationPct,
      LIMITS.poolishHydrationPct.min,
      LIMITS.poolishHydrationPct.max,
    ) / 100;

  const hardMaxFlourG = Math.max(0, Math.min(totalFlourG, totalWaterG / hyd));

  const byPct = totalFlourG * (POOLISH_PCT_CAP / 100);
  const byFinalWater = (totalWaterG - MIN_FINAL_WATER_G) / hyd;
  const maxFlourG = Math.max(0, Math.min(hardMaxFlourG, byPct, byFinalWater));

  const maxPercent =
    totalFlourG > 0
      ? clamp((maxFlourG / totalFlourG) * 100, 0, POOLISH_PCT_CAP)
      : 0;

  return { hardMaxFlourG, maxFlourG, maxPercent };
}

export function calcDough(i: DoughInputs): DoughResult {
  const balls = clamp(
    Math.floor(i.balls || LIMITS.balls.min),
    LIMITS.balls.min,
    LIMITS.balls.max,
  );
  const ballWeightG = clamp(
    i.ballWeightG || 250,
    LIMITS.ballWeightG.min,
    LIMITS.ballWeightG.max,
  );
  const totalDough = balls * ballWeightG;

  const h =
    clamp(
      i.hydrationPct || 65,
      LIMITS.hydrationPct.min,
      LIMITS.hydrationPct.max,
    ) / 100;

  const honeyG = i.usePoolish ? POOLISH_HONEY_G : 0;
  const massForDough = Math.max(1, totalDough - honeyG);

  const flour = massForDough / (1 + h * (1 + SALT_PER_WATER));
  const water = flour * h;
  const saltG = water * SALT_PER_WATER;

  const yeastG = clamp(i.yeastG ?? 0, LIMITS.yeastG.min, LIMITS.yeastG.max);

  const base: DoughResult = {
    totalDoughG: round1(totalDough),
    flourG: round1(flour),
    waterG: round1(water),
    saltG: round1(saltG),
    saltRule: "Salz fix: 45 g pro 1000 ml Wasser.",
    yeastKind: i.yeastKind,
    poolish: null,
    finalMix: {
      flourG: round1(flour),
      waterG: round1(water),
      saltG: round1(saltG),
      yeastG: round1(yeastG),
    },
  };

  if (!i.usePoolish) return base;

  const poolishHyd =
    clamp(
      i.poolishHydrationPct || 100,
      LIMITS.poolishHydrationPct.min,
      LIMITS.poolishHydrationPct.max,
    ) / 100;

  const requested =
    i.poolishMode === "fixed"
      ? Math.max(0, i.poolishFlourFixedG ?? 0)
      : (clamp(i.poolishPercent ?? 0, 0, 100) / 100) * flour;

  const { hardMaxFlourG } = poolishLimits(flour, water, poolishHyd * 100);

  const poolishFlour = Math.min(requested, hardMaxFlourG);
  let note: string | undefined;

  if (requested > hardMaxFlourG + 0.05) {
    note =
      `Poolish begrenzt: gewünscht ${round1(requested)} g Poolish-Mehl, ` +
      `möglich max ${round1(poolishFlour)} g (sonst wird Final-Wasser negativ).`;
  }

  const poolishWater = poolishFlour * poolishHyd;

  return {
    ...base,
    poolish: {
      flourG: round1(poolishFlour),
      waterG: round1(poolishWater),
      yeastG: round1(yeastG),
      honeyG: POOLISH_HONEY_G,
      hydrationPct: round1(poolishHyd * 100),
      note,
    },
    finalMix: {
      flourG: round1(flour - poolishFlour),
      waterG: round1(water - poolishWater),
      saltG: round1(saltG),
      // Germ steckt komplett im Poolish, Salz komplett im Hauptteig.
      yeastG: 0,
      note,
    },
  };
}
