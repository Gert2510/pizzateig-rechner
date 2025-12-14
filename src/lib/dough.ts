export type PoolishMode = "percent" | "fixed";

export type DoughInputs = {
  balls: number;
  ballWeightG: number;

  hydrationPct: number;

  usePoolish: boolean;
  poolishMode: PoolishMode;
  poolishPercent: number;
  poolishFlourFixedG: number;

  poolishHydrationPct: number;
  poolishYeastG: number; // Germ in g (nur Poolish)
};

export type DoughResult = {
  totalDoughG: number;
  flourG: number;
  waterG: number;
  saltG: number;

  saltRule: string;

  poolish: null | {
    flourG: number;
    waterG: number;
    yeastG: number;
    honeyG: number;
    hydrationPct: number;
    note?: string;
  };

  finalMix: {
    flourG: number;
    waterG: number;
    saltG: number;
    note?: string;
  };
};

function round1(x: number) {
  return Math.round(x * 10) / 10;
}

function clamp(x: number, min: number, max: number) {
  return Math.min(max, Math.max(min, x));
}

/**
 * Salzregel: 45 g pro 1000 ml Wasser.
 * Annahme: 1 ml Wasser ≈ 1 g.
 * => salt = water * 0.045
 */
const SALT_PER_WATER = 45 / 1000; // 0.045

// Honig fix im Poolish:
const POOLISH_HONEY_G = 5;

export function calcDough(i: DoughInputs): DoughResult {
  const balls = clamp(Math.floor(i.balls || 1), 1, 100);
  const ballWeightG = clamp(i.ballWeightG || 250, 150, 450);
  const totalDough = balls * ballWeightG;

  const h = clamp(i.hydrationPct || 65, 50, 80) / 100;

  // Honig zählt zur Gesamtmasse, damit Teiglinggewicht passt
  const honeyG = i.usePoolish ? POOLISH_HONEY_G : 0;
  const effectiveTotal = Math.max(1, totalDough - honeyG);

  // total = F + W + S + honey
  // W = hF
  // S = 0.045W = 0.045*hF
  // => effectiveTotal = F * (1 + h*(1+0.045))
  const flour = effectiveTotal / (1 + h * (1 + SALT_PER_WATER));
  const water = flour * h;
  const saltG = water * SALT_PER_WATER;

  const base: DoughResult = {
    totalDoughG: round1(totalDough),
    flourG: round1(flour),
    waterG: round1(water),
    saltG: round1(saltG),
    saltRule: "Salz fix: 45 g pro 1000 ml Wasser.",
    poolish: null,
    finalMix: {
      flourG: round1(flour),
      waterG: round1(water),
      saltG: round1(saltG),
    },
  };

  if (!i.usePoolish) return base;

  const poolishHyd = clamp(i.poolishHydrationPct || 100, 60, 130) / 100;

  let poolishFlour =
    i.poolishMode === "fixed"
      ? clamp(i.poolishFlourFixedG || 300, 0, flour)
      : (clamp(i.poolishPercent || 50, 0, 100) / 100) * flour;

  const maxPoolishFlourByWater = water / poolishHyd;
  let note: string | undefined;

  if (poolishFlour > maxPoolishFlourByWater) {
    poolishFlour = maxPoolishFlourByWater;
    note =
      "Poolish begrenzt, damit Final-Wasser nicht negativ wird (Hydration zu niedrig/Poolish zu groß).";
  }

  const poolishWater = poolishFlour * poolishHyd;
  const poolishYeastG = clamp(i.poolishYeastG || 0, 0, 100);

  return {
    ...base,
    poolish: {
      flourG: round1(poolishFlour),
      waterG: round1(poolishWater),
      yeastG: round1(poolishYeastG),
      honeyG: POOLISH_HONEY_G,
      hydrationPct: round1(poolishHyd * 100),
      note,
    },
    finalMix: {
      flourG: round1(flour - poolishFlour),
      waterG: round1(water - poolishWater),
      saltG: round1(saltG), // Salz komplett im Final
      note,
    },
  };
}
