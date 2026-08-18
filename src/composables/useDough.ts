import { computed, ref, watch } from "vue";
import { useStorage } from "@vueuse/core";

import {
  calcDough,
  convertYeast,
  poolishLimits,
  LIMITS,
  MIN_FINAL_WATER_G,
  POOLISH_PCT_RECOMMENDED,
  type PoolishMode,
  type YeastKind,
} from "@/lib/dough";
import { formatNumberDE, intOr, numOr, parseNumberDE } from "@/lib/format";
import { fullSheetText } from "@/lib/recipe";

/** Bump, wenn sich das gespeicherte Format inkompatibel ändert. */
const STORAGE_KEY = "pizzateig:v1";

export const BALL_WEIGHT_OPTIONS = [
  200, 230, 250, 270, 280, 300, 320, 350,
] as const;
export const HYDRATION_OPTIONS = [55, 58, 60, 62, 65, 68, 70, 72, 75] as const;
export const POOLISH_HYDRATION_OPTIONS = [80, 90, 100, 110] as const;
export const POOLISH_PRESETS_G = [200, 300, 400] as const;

type PersistedState = {
  ballsText: string;
  ballWeightG: number;
  hydrationPct: number;
  usePoolish: boolean;
  poolishMode: PoolishMode;
  poolishPercentText: string;
  poolishFlourFixedText: string;
  poolishHydrationPct: number;
  yeastText: string;
  yeastKind: YeastKind;
  autoClampPoolish: boolean;
};

const DEFAULTS: PersistedState = {
  ballsText: "4",
  ballWeightG: 280,
  hydrationPct: 65,
  usePoolish: true,
  poolishMode: "fixed",
  poolishPercentText: "35",
  poolishFlourFixedText: "300",
  poolishHydrationPct: 100,
  yeastText: "3",
  yeastKind: "dry",
  autoClampPoolish: true,
};

/**
 * Gesamter Rechner-State: Eingaben (in localStorage gesichert), abgeleitete
 * Werte und die Aktionen aus den Warnhinweisen. Modul-Singleton, damit sich
 * alle Karten dieselbe Quelle teilen.
 */
const state = useStorage<PersistedState>(
  STORAGE_KEY,
  { ...DEFAULTS },
  localStorage,
  {
    mergeDefaults: true,
  },
);

const ballsText = toRefOf("ballsText");
const ballWeightG = toRefOf("ballWeightG");
const hydrationPct = toRefOf("hydrationPct");
const usePoolish = toRefOf("usePoolish");
const poolishMode = toRefOf("poolishMode");
const poolishPercentText = toRefOf("poolishPercentText");
const poolishFlourFixedText = toRefOf("poolishFlourFixedText");
const poolishHydrationPct = toRefOf("poolishHydrationPct");
const yeastText = toRefOf("yeastText");
const yeastKind = toRefOf("yeastKind");
const autoClampPoolish = toRefOf("autoClampPoolish");

function toRefOf<K extends keyof PersistedState>(key: K) {
  return computed({
    get: () => state.value[key],
    set: (v: PersistedState[K]) => {
      state.value = { ...state.value, [key]: v };
    },
  });
}

// ---------- geparste Eingaben ----------
const balls = computed(() =>
  Math.min(
    LIMITS.balls.max,
    Math.max(LIMITS.balls.min, intOr(ballsText.value, LIMITS.balls.min)),
  ),
);
const yeastG = computed(() => Math.max(0, numOr(yeastText.value, 0)));
const poolishFlourFixedG = computed(() =>
  Math.max(0, numOr(poolishFlourFixedText.value, 0)),
);

// ---------- Grenzen ----------
/** Mehl/Wasser hängen nicht vom Poolish ab – reicht für die Grenzwerte. */
const totals = computed(() =>
  calcDough({
    balls: balls.value,
    ballWeightG: ballWeightG.value,
    hydrationPct: hydrationPct.value,
    usePoolish: usePoolish.value,
    poolishMode: "fixed",
    poolishPercent: 0,
    poolishFlourFixedG: 0,
    poolishHydrationPct: poolishHydrationPct.value,
    yeastG: 0,
    yeastKind: yeastKind.value,
  }),
);

const limits = computed(() =>
  poolishLimits(
    totals.value.flourG,
    totals.value.waterG,
    poolishHydrationPct.value,
  ),
);

const poolishPercentN = computed(() =>
  Math.max(
    0,
    Math.min(limits.value.maxPercent, numOr(poolishPercentText.value, 0)),
  ),
);

// ---------- Ergebnis ----------
const result = computed(() =>
  calcDough({
    balls: balls.value,
    ballWeightG: ballWeightG.value,
    hydrationPct: hydrationPct.value,
    usePoolish: usePoolish.value,
    poolishMode: poolishMode.value,
    poolishPercent: poolishPercentN.value,
    poolishFlourFixedG: poolishFlourFixedG.value,
    poolishHydrationPct: poolishHydrationPct.value,
    yeastG: yeastG.value,
    yeastKind: yeastKind.value,
  }),
);

const sheetText = computed(() =>
  fullSheetText(result.value, balls.value, ballWeightG.value),
);

// ---------- Warnungen rund um den Poolish ----------
const requestedPoolishFlourG = computed(
  () => parseNumberDE(poolishFlourFixedText.value) ?? 0,
);

const predictedFinalWaterG = computed(
  () =>
    totals.value.waterG -
    requestedPoolishFlourG.value * (poolishHydrationPct.value / 100),
);

const poolishTooBig = computed(
  () =>
    usePoolish.value &&
    poolishMode.value === "fixed" &&
    parseNumberDE(poolishFlourFixedText.value) !== null &&
    requestedPoolishFlourG.value > limits.value.maxFlourG + 0.05,
);

const finalWaterTooLow = computed(
  () => usePoolish.value && result.value.finalMix.waterG < MIN_FINAL_WATER_G,
);

/** Letzte automatische Begrenzung – für den Hinweis „von X auf Y“. */
const clampInfo = ref<{ from: number; to: number } | null>(null);

// ---------- Aktionen ----------
function setPoolishToMax(): number {
  const to = Math.max(0, Math.floor(limits.value.maxFlourG));
  poolishFlourFixedText.value = String(to);
  return to;
}

function switchToPercentThatFits(): void {
  poolishMode.value = "percent";
  poolishPercentText.value = formatNumberDE(
    Math.min(POOLISH_PCT_RECOMMENDED, limits.value.maxPercent),
    1,
  );
}

function applyPoolishPreset(flourG: number): void {
  usePoolish.value = true;
  poolishMode.value = "fixed";
  poolishHydrationPct.value = 100;
  poolishFlourFixedText.value = String(flourG);
  if (autoClampPoolish.value && flourG > limits.value.maxFlourG + 0.05) {
    setPoolishToMax();
  }
}

/** Prozenteingabe erst beim Verlassen des Feldes zurechtrücken. */
function clampPoolishPercent(): void {
  if (!usePoolish.value || poolishMode.value !== "percent") return;

  const v = parseNumberDE(poolishPercentText.value);
  const fallback = Math.min(POOLISH_PCT_RECOMMENDED, limits.value.maxPercent);
  const next =
    v === null ? fallback : Math.max(0, Math.min(limits.value.maxPercent, v));

  poolishPercentText.value = formatNumberDE(next, 1);
}

function setYeastKind(kind: YeastKind): void {
  if (kind === yeastKind.value) return;
  const current = parseNumberDE(yeastText.value) ?? 0;
  yeastText.value = formatNumberDE(
    convertYeast(current, yeastKind.value, kind),
    3,
  );
  yeastKind.value = kind;
}

function reset(): void {
  state.value = { ...DEFAULTS };
  clampInfo.value = null;
}

// ---------- Watcher ----------
/** Fixe Poolish-Menge automatisch auf das empfohlene Maximum begrenzen. */
watch(
  [
    poolishFlourFixedText,
    () => limits.value.maxFlourG,
    autoClampPoolish,
    usePoolish,
    poolishMode,
  ],
  () => {
    if (!autoClampPoolish.value) return;
    if (!usePoolish.value || poolishMode.value !== "fixed") return;

    const v = parseNumberDE(poolishFlourFixedText.value);
    if (v === null || v <= limits.value.maxFlourG + 0.05) return;

    clampInfo.value = { from: v, to: setPoolishToMax() };
  },
  { immediate: true },
);

/** Hinweis wieder ausblenden, sobald er nicht mehr passt. */
watch([usePoolish, poolishMode, poolishFlourFixedText], () => {
  if (!clampInfo.value) return;
  if (!usePoolish.value || poolishMode.value !== "fixed") {
    clampInfo.value = null;
    return;
  }
  const v = parseNumberDE(poolishFlourFixedText.value);
  if (v !== null && Math.abs(v - clampInfo.value.to) > 0.05) {
    clampInfo.value = null;
  }
});

/** Prozentwert nachziehen, wenn sich das erlaubte Maximum ändert. */
const percentFieldFocused = ref(false);
watch(
  () => limits.value.maxPercent,
  () => {
    if (!percentFieldFocused.value) clampPoolishPercent();
  },
);

export function useDough() {
  return {
    // Eingaben
    ballsText,
    ballWeightG,
    hydrationPct,
    usePoolish,
    poolishMode,
    poolishPercentText,
    poolishFlourFixedText,
    poolishHydrationPct,
    yeastText,
    yeastKind,
    autoClampPoolish,
    percentFieldFocused,

    // Abgeleitet
    balls,
    limits,
    result,
    sheetText,
    requestedPoolishFlourG,
    predictedFinalWaterG,
    poolishTooBig,
    finalWaterTooLow,
    clampInfo,

    // Aktionen
    setPoolishToMax,
    switchToPercentThatFits,
    applyPoolishPreset,
    clampPoolishPercent,
    setYeastKind,
    reset,
  };
}
