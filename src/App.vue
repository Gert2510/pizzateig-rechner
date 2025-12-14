<script setup lang="ts">
import { computed, ref, watch, watchEffect } from "vue";
import { calcDough, type PoolishMode } from "@/lib/dough";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// ---------- helpers (DE: Komma erlaubt) ----------
function parseNumberDE(raw: string): number | null {
    const s = (raw ?? "").trim().replace(",", ".");
    if (s === "") return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
}
function numOr(raw: string, fallback: number): number {
    return parseNumberDE(raw) ?? fallback;
}
function intOr(raw: string, fallback: number): number {
    const n = parseNumberDE(raw);
    if (n === null) return fallback;
    return Math.trunc(n);
}
function formatNumberDE(n: number, decimals = 3) {
    const s = n.toFixed(decimals).replace(/\.?0+$/, "");
    return s.replace(".", ",");
}
function fmt(g: number) {
    return `${g.toFixed(1)} g`;
}

// ---------- Theme (Light/Dark) ----------
const savedTheme = localStorage.getItem("theme");
const prefersDark =
    window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
const isDark = ref(savedTheme ? savedTheme === "dark" : prefersDark);

watch(
    isDark,
    (v) => {
        document.documentElement.classList.toggle("dark", v);
        localStorage.setItem("theme", v ? "dark" : "light");
    },
    { immediate: true },
);

// ---------- Inputs ----------
const ballsText = ref("4");

const ballWeightOptions = [200, 230, 250, 270, 280, 300, 320, 350];
const ballWeightG = ref<number>(280);

const hydrationOptions = [55, 58, 60, 62, 65, 68, 70, 72, 75];
const hydrationPct = ref<number>(65);

// Poolish
const usePoolish = ref<boolean>(true);
const poolishMode = ref<PoolishMode>("fixed");

const poolishPercentText = ref("50");
const poolishFlourFixedText = ref("300");
const poolishHydrationPct = ref<number>(100);

// Germ nur im Poolish (Gramm)
const poolishYeastText = ref("3");

// Trocken vs Frisch
const freshYeast = ref(false); // false = Trocken, true = Frisch
const YEAST_CONV = 3; // 1g trocken ~ 3g frisch

watch(
    freshYeast,
    (isFresh, wasFresh) => {
        if (isFresh === wasFresh) return;
        const current = parseNumberDE(poolishYeastText.value) ?? 0;
        const converted = isFresh ? current * YEAST_CONV : current / YEAST_CONV;
        poolishYeastText.value = formatNumberDE(converted, 3);
    },
    { immediate: false },
);

const yeastKindLabel = computed(() =>
    freshYeast.value ? "Frischgerm" : "Trockengerm",
);

// ---------- Parsed Werte für Berechnung ----------
const ballsN = computed(() => {
    const v = intOr(ballsText.value, 2);
    return Math.min(100, Math.max(1, v));
});

// shadcn Select: string values
const ballWeightSelect = computed({
    get: () => String(ballWeightG.value),
    set: (v: string) => (ballWeightG.value = Number(v)),
});
const hydrationSelect = computed({
    get: () => String(hydrationPct.value),
    set: (v: string) => (hydrationPct.value = Number(v)),
});
const poolishHydSelect = computed({
    get: () => String(poolishHydrationPct.value),
    set: (v: string) => (poolishHydrationPct.value = Number(v)),
});
const poolishModeSelect = computed({
    get: () => poolishMode.value,
    set: (v: string) => (poolishMode.value = v as PoolishMode),
});

const poolishFlourFixedN = computed(() =>
    numOr(poolishFlourFixedText.value, 300),
);
const poolishYeastN = computed(() =>
    Math.max(0, numOr(poolishYeastText.value, 0)),
);

// ---------- result (wird für Guards gebraucht) ----------
const result = computed(() =>
    calcDough({
        balls: ballsN.value,
        ballWeightG: ballWeightG.value,
        hydrationPct: hydrationPct.value,

        usePoolish: usePoolish.value,
        poolishMode: poolishMode.value,
        poolishPercent: 0, // wird unten über poolishPercentN gesetzt
        poolishFlourFixedG: poolishFlourFixedN.value,
        poolishHydrationPct: poolishHydrationPct.value,
        poolishYeastG: usePoolish.value ? poolishYeastN.value : 0,
    }),
);

// --- Poolish: Guard gegen "300/300 bei kleinem Teig" ---
const autoClampPoolish = ref(true);
const poolishClampInfo = ref<null | { from: number; to: number }>(null);

// Empfehlung Neapolitan:
const POOLISH_PCT_RECOMMENDED = 35; // Zielwert beim "% umstellen"
const POOLISH_PCT_CAP = 40; // niemals höher setzen
const MIN_FINAL_WATER_G = 30; // im Final soll Wasser übrig bleiben

const totalWaterG = computed(() => result.value.waterG);
const totalFlourG = computed(() => result.value.flourG);

// Poolish-Hydration als Faktor
const poolishHydFactor = computed(() => poolishHydrationPct.value / 100);

// Technisches Maximum (Final-Wasser nicht negativ)
const poolishMaxFlourHardG = computed(() => {
    const byWater = totalWaterG.value / poolishHydFactor.value;
    return Math.max(0, Math.min(totalFlourG.value, byWater));
});

// Praxis-Maximum: cap 40% + Mindest-Finalwasser
const poolishMaxFlourG = computed(() => {
    const capByPct = totalFlourG.value * (POOLISH_PCT_CAP / 100);
    const byFinalWater =
        (totalWaterG.value - MIN_FINAL_WATER_G) / poolishHydFactor.value;

    return Math.max(
        0,
        Math.min(poolishMaxFlourHardG.value, capByPct, byFinalWater),
    );
});

const poolishPercentCap = computed(() => {
    if (totalFlourG.value <= 0) return 0;
    const recommendedMaxPct =
        (poolishMaxFlourG.value / totalFlourG.value) * 100;
    return Math.max(0, Math.min(POOLISH_PCT_CAP, recommendedMaxPct));
});

const requestedPoolishFlourFixedG = computed(
    () => parseNumberDE(poolishFlourFixedText.value) ?? 0,
);

const predictedFinalWaterIfRequested = computed(() => {
    const poolishWater =
        requestedPoolishFlourFixedG.value * poolishHydFactor.value;
    return totalWaterG.value - poolishWater;
});

const poolishTooBigFixed = computed(() => {
    if (!usePoolish.value) return false;
    if (poolishMode.value !== "fixed") return false;
    if (parseNumberDE(poolishFlourFixedText.value) === null) return false;
    return requestedPoolishFlourFixedG.value > poolishMaxFlourG.value + 0.05;
});

const finalWaterVeryLow = computed(() => {
    return usePoolish.value && result.value.finalMix.waterG < MIN_FINAL_WATER_G;
});

function setPoolishToMax() {
    const to = Math.floor(poolishMaxFlourG.value);
    const safeTo = Math.max(0, to);
    poolishFlourFixedText.value = String(safeTo);
    return safeTo;
}

function switchToPercentThatFits() {
    const maxPct = poolishPercentCap.value;
    const pct =
        maxPct >= POOLISH_PCT_RECOMMENDED ? POOLISH_PCT_RECOMMENDED : maxPct;

    poolishMode.value = "percent";
    poolishPercentText.value = formatNumberDE(pct, 1);
}

// Optional: automatische Begrenzung bei FIXED
watchEffect(() => {
    if (!autoClampPoolish.value) return;
    if (!usePoolish.value) return;
    if (poolishMode.value !== "fixed") return;

    const v = parseNumberDE(poolishFlourFixedText.value);
    if (v === null) return;

    if (v > poolishMaxFlourG.value + 0.05) {
        const from = v;
        const to = setPoolishToMax();
        poolishClampInfo.value = { from, to };
    }
});

watch([usePoolish, poolishMode], () => {
    if (!usePoolish.value || poolishMode.value !== "fixed") {
        poolishClampInfo.value = null;
    }
});

watch(poolishFlourFixedText, () => {
    const v = parseNumberDE(poolishFlourFixedText.value);
    if (v === null) return;
    if (
        poolishClampInfo.value &&
        Math.abs(v - poolishClampInfo.value.to) > 0.05
    ) {
        poolishClampInfo.value = null;
    }
});

// ---- Percent input clamp (nur bei blur) ----
const poolishPercentEditing = ref(false);

function clampPoolishPercentNow() {
    if (!usePoolish.value) return;
    if (poolishMode.value !== "percent") return;

    const v = parseNumberDE(poolishPercentText.value);
    if (v === null) {
        const fallback =
            poolishPercentCap.value >= POOLISH_PCT_RECOMMENDED
                ? POOLISH_PCT_RECOMMENDED
                : poolishPercentCap.value;
        poolishPercentText.value = formatNumberDE(fallback, 1);
        return;
    }

    const clamped = Math.max(0, Math.min(poolishPercentCap.value, v));
    poolishPercentText.value = formatNumberDE(clamped, 1);
}

watch(
    [
        () => ballsText.value,
        () => ballWeightG.value,
        () => hydrationPct.value,
        () => poolishHydrationPct.value,
        () => usePoolish.value,
        () => poolishMode.value,
    ],
    () => {
        if (poolishPercentEditing.value) return;
        clampPoolishPercentNow();
    },
);

// poolishPercentN (berechnungssicher)
const poolishPercentN = computed(() => {
    const v = numOr(poolishPercentText.value, 50);
    return Math.max(0, Math.min(poolishPercentCap.value, v));
});

// ---------- recompute result with correct poolishPercent ----------
const result2 = computed(() =>
    calcDough({
        balls: ballsN.value,
        ballWeightG: ballWeightG.value,
        hydrationPct: hydrationPct.value,

        usePoolish: usePoolish.value,
        poolishMode: poolishMode.value,
        poolishPercent: poolishPercentN.value,
        poolishFlourFixedG: poolishFlourFixedN.value,
        poolishHydrationPct: poolishHydrationPct.value,
        poolishYeastG: usePoolish.value ? poolishYeastN.value : 0,
    }),
);

// use result2 everywhere below
const activeResult = result2;

function setPoolishPreset(flour: number) {
    usePoolish.value = true;
    poolishMode.value = "fixed";
    poolishHydrationPct.value = 100;
    poolishFlourFixedText.value = String(flour);

    if (autoClampPoolish.value) {
        const v = parseNumberDE(poolishFlourFixedText.value) ?? flour;
        if (v > poolishMaxFlourG.value + 0.05) setPoolishToMax();
    }
}

// ---------- Küchenzettel Text ----------
const recipeText = computed(() => {
    const r = activeResult.value;

    const poolishBlock = r.poolish
        ? `POOLISH (${r.poolish.hydrationPct}%)
- Wasser: ${fmt(r.poolish.waterG)}
- Germ:   ${fmt(r.poolish.yeastG)} (${yeastKindLabel.value})
- Honig:  ${fmt(r.poolish.honeyG)}
- Mehl:   ${fmt(r.poolish.flourG)}
${r.poolish.note ? `Hinweis: ${r.poolish.note}\n` : ""}`
        : `POOLISH: aus\n`;

    return `PIZZATEIG REZEPT (Küchenzettel)

Teiglinge: ${ballsN.value} × ${ballWeightG.value} g = ${fmt(r.totalDoughG)}
Hydration: ${hydrationPct.value}%
${r.saltRule}

GESAMT
- Mehl:   ${fmt(r.flourG)}
- Wasser: ${fmt(r.waterG)}
- Salz:   ${fmt(r.saltG)}

${poolishBlock}
FINAL
- Rest-Wasser: ${fmt(r.finalMix.waterG)}
- Rest-Mehl:   ${fmt(r.finalMix.flourG)}
- Salz:        ${fmt(r.finalMix.saltG)}
${r.finalMix.note ? `Hinweis: ${r.finalMix.note}\n` : ""}`.trim();
});

const instructionsText = computed(() => {
    const r = activeResult.value;
    const p = r.poolish;

    const poolishLine = p
        ? `POOLISH:
1) Wasser (${fmt(p.waterG)})
2) Germ auflösen (${fmt(p.yeastG)} ${yeastKindLabel.value})
3) Honig einrühren (${fmt(p.honeyG)})
4) Mehl dazu (${fmt(p.flourG)}), umrühren
5) Folie drauf, mit Gabel Löcher rein
6) mind. 16h Kühlschrank`
        : `POOLISH: aus`;

    return `ANLEITUNG
${poolishLine}

HAUPTTEIG:
1) Poolish in Maschine
2) Rest-Wasser (${fmt(r.finalMix.waterG)})
3) Rest-Mehl (${fmt(r.finalMix.flourG)})
4) Salz (${fmt(r.finalMix.saltG)}) dazu
5) Kneten bis glatt

FORMEN/GEHEN:
- Falten, formen, 15 min rasten
- Nochmal Kugel formen, 1h zugedeckt rasten lassen
- Portionieren: ${ballsN.value} × ${ballWeightG.value} g
- in Gefäß (Pizzabox), mind. 2h zugedeckt gehen lassen`;
});

const toppingsText = computed(() => {
    return `Zutaten Pizza Margherita
Sauce: ganze Tomaten + Salz + Olivenöl + Basilikum
Belag: Parmesan + Mozzarella (abtropfen, schneiden) + Basilikum + Olivenöl`;
});

const fullSheetText = computed(() => {
    return `${recipeText.value}\n\n${instructionsText.value}\n\n${toppingsText.value}`.trim();
});

async function copyToClipboard() {
    await navigator.clipboard.writeText(fullSheetText.value);
}

function printSheet() {
    window.print();
}
</script>

<template>
    <main class="mx-auto max-w-3xl px-4 py-10">
        <header class="mb-6 print:hidden">
            <div class="flex items-start justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-semibold">Pizzateig Rechner</h1>
                    <p class="mt-1 text-sm text-muted-foreground">
                        Der perfekte neapolitanische Pizzateig.
                    </p>
                </div>

                <div class="flex items-center gap-3">
                    <span class="text-xs text-muted-foreground">Light</span>
                    <Switch v-model:checked="isDark" />
                    <span class="text-xs text-muted-foreground">Dark</span>
                </div>
            </div>
        </header>

        <div class="grid gap-4 md:grid-cols-2">
            <!-- Basics -->
            <Card class="print:hidden">
                <CardHeader>
                    <CardTitle>Basics</CardTitle>
                    <CardDescription
                        >Teiglinge, Grammatur, Hydration</CardDescription
                    >
                </CardHeader>
                <CardContent class="space-y-4">
                    <div class="space-y-2">
                        <Label>Teiglinge</Label>
                        <Input
                            v-model="ballsText"
                            type="text"
                            inputmode="numeric"
                            placeholder="z.B. 2"
                        ></Input>
                    </div>

                    <div class="space-y-2">
                        <Label>Teigling-Grammatur</Label>
                        <Select v-model="ballWeightSelect">
                            <SelectTrigger>
                                <SelectValue placeholder="Wähle Grammatur" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem
                                        v-for="g in ballWeightOptions"
                                        :key="g"
                                        :value="String(g)"
                                    >
                                        {{ g }} g
                                    </SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>

                    <div class="space-y-2">
                        <Label>Hydration</Label>
                        <Select v-model="hydrationSelect">
                            <SelectTrigger>
                                <SelectValue placeholder="Wähle Hydration" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem
                                        v-for="h in hydrationOptions"
                                        :key="h"
                                        :value="String(h)"
                                    >
                                        {{ h }}%
                                    </SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>

                    <Separator />

                    <div class="text-sm text-muted-foreground">
                        Salz wird automatisch berechnet:
                        <span class="font-medium">45 g pro 1000 ml Wasser</span
                        >.
                    </div>
                </CardContent>
            </Card>

            <!-- Poolish -->
            <Card class="print:hidden">
                <CardHeader>
                    <CardTitle>Poolish</CardTitle>
                    <CardDescription>Vorteig - Empfohlen</CardDescription>
                </CardHeader>
                <CardContent class="space-y-4">
                    <div class="flex items-center justify-between">
                        <div class="space-y-1">
                            <div class="text-sm font-medium">
                                Poolish verwenden
                            </div>
                            <div class="text-xs text-muted-foreground">
                                An/aus
                            </div>
                        </div>
                        <Switch v-model:checked="usePoolish" />
                    </div>

                    <div
                        :class="
                            usePoolish
                                ? 'space-y-4'
                                : 'space-y-4 opacity-50 pointer-events-none'
                        "
                    >
                        <div class="space-y-2">
                            <Label>Poolish Hydration</Label>
                            <Select v-model="poolishHydSelect">
                                <SelectTrigger>
                                    <SelectValue placeholder="Hydration" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="80">80%</SelectItem>
                                        <SelectItem value="90">90%</SelectItem>
                                        <SelectItem value="100"
                                            >100%</SelectItem
                                        >
                                        <SelectItem value="110"
                                            >110%</SelectItem
                                        >
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>

                        <div class="space-y-2">
                            <Label>Poolish-Modus</Label>
                            <Select v-model="poolishModeSelect">
                                <SelectTrigger>
                                    <SelectValue placeholder="Modus" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="fixed"
                                            >Fix (g Mehl) – z.B.
                                            300/300</SelectItem
                                        >
                                        <SelectItem value="percent"
                                            >Anteil (%) vom
                                            Gesamtmehl</SelectItem
                                        >
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>

                        <div v-if="poolishMode === 'fixed'" class="space-y-2">
                            <Label>Poolish Mehl (g)</Label>
                            <Input
                                v-model="poolishFlourFixedText"
                                type="text"
                                inputmode="numeric"
                                placeholder="z.B. 300"
                            ></Input>

                            <div
                                v-if="
                                    poolishTooBigFixed ||
                                    finalWaterVeryLow ||
                                    poolishClampInfo
                                "
                                class="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300"
                            >
                                <div
                                    class="flex items-start justify-between gap-3"
                                >
                                    <div class="font-medium">
                                        Poolish Hinweis
                                    </div>

                                    <Button
                                        variant="ghost"
                                        class="h-7 px-2 text-xs"
                                        @click="poolishClampInfo = null"
                                        v-if="poolishClampInfo"
                                    >
                                        OK
                                    </Button>
                                </div>

                                <div class="mt-1 space-y-1 text-xs opacity-90">
                                    <div v-if="poolishClampInfo">
                                        Auto begrenzt:
                                        <span class="font-semibold"
                                            >{{
                                                poolishClampInfo.from.toFixed(1)
                                            }}
                                            g</span
                                        >
                                        →
                                        <span class="font-semibold"
                                            >{{
                                                poolishClampInfo.to.toFixed(1)
                                            }}
                                            g</span
                                        >
                                        (damit der Hauptteig noch Wasser zum
                                        Kneten hat).
                                    </div>

                                    <div>
                                        Empfohlenes Maximum bei
                                        {{ poolishHydrationPct }}%
                                        Poolish-Hydration:
                                        <span class="font-semibold"
                                            >{{
                                                poolishMaxFlourG.toFixed(1)
                                            }}
                                            g</span
                                        >
                                        (≤ 40% vom Gesamtmehl, Final-Wasser ≥ 30
                                        g).
                                    </div>

                                    <div>
                                        Du hast
                                        <span class="font-semibold"
                                            >{{
                                                requestedPoolishFlourFixedG.toFixed(
                                                    1,
                                                )
                                            }}
                                            g</span
                                        >
                                        gewählt → Final-Wasser wäre
                                        <span class="font-semibold"
                                            >{{
                                                predictedFinalWaterIfRequested.toFixed(
                                                    1,
                                                )
                                            }}
                                            g</span
                                        >.
                                    </div>
                                </div>

                                <div
                                    class="mt-3 flex flex-wrap items-center gap-2"
                                >
                                    <Button
                                        variant="secondary"
                                        @click="setPoolishToMax"
                                        >Auf Max setzen</Button
                                    >
                                    <Button
                                        variant="secondary"
                                        @click="switchToPercentThatFits"
                                        >Auf % umstellen</Button
                                    >

                                    <div
                                        class="ml-auto flex items-center gap-2"
                                    >
                                        <span class="text-xs opacity-80"
                                            >Auto begrenzen</span
                                        >
                                        <Switch
                                            v-model:checked="autoClampPoolish"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div class="flex flex-wrap gap-2">
                                <Button
                                    variant="secondary"
                                    @click="setPoolishPreset(200)"
                                    >200/200</Button
                                >
                                <Button
                                    variant="secondary"
                                    @click="setPoolishPreset(300)"
                                    >300/300</Button
                                >
                                <Button
                                    variant="secondary"
                                    @click="setPoolishPreset(400)"
                                    >400/400</Button
                                >
                            </div>
                        </div>

                        <div v-else class="space-y-2">
                            <Label>Poolish Anteil (% vom Gesamtmehl)</Label>
                            <Input
                                v-model="poolishPercentText"
                                type="text"
                                inputmode="numeric"
                                placeholder="z.B. 35"
                                @focus="poolishPercentEditing = true"
                                @blur="
                                    poolishPercentEditing = false;
                                    clampPoolishPercentNow();
                                "
                            ></Input>
                            <p class="text-xs text-muted-foreground">
                                Empfehlung: 35%. Max erlaubt:
                                {{ poolishPercentCap.toFixed(1) }}%.
                            </p>
                        </div>

                        <Separator />

                        <div class="flex items-center justify-between">
                            <div class="space-y-1">
                                <div class="text-sm font-medium">Germ-Art</div>
                                <div class="text-xs text-muted-foreground">
                                    Trocken ↔ Frisch <br />
                                    (Umrechnung 1:3)
                                </div>
                            </div>

                            <div class="flex items-center gap-2">
                                <span class="text-xs text-muted-foreground"
                                    >Trocken</span
                                >
                                <Switch v-model:checked="freshYeast" />
                                <span class="text-xs text-muted-foreground"
                                    >Frisch</span
                                >
                            </div>
                        </div>

                        <div class="space-y-2">
                            <Label>Germ im Poolish (g)</Label>
                            <Input
                                v-model="poolishYeastText"
                                type="text"
                                inputmode="decimal"
                                placeholder="z.B. 0,3"
                            ></Input>
                            <p class="text-xs text-muted-foreground">
                                Wird nur im Poolish verwendet. Beim Umschalten
                                wird automatisch umgerechnet.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <!-- Küchenzettel -->
            <Card class="md:col-span-2 print:border-0 print:shadow-none">
                <CardHeader class="print:pb-0">
                    <CardTitle>Küchenzettel</CardTitle>
                    <CardDescription class="print:hidden"
                        >Kopieren oder drucken</CardDescription
                    >
                </CardHeader>

                <CardContent class="space-y-3">
                    <div
                        id="print-area"
                        class="whitespace-pre-line rounded-md border bg-muted p-4 font-mono text-sm print:border-0 print:bg-transparent print:p-0"
                    >
                        {{ fullSheetText }}
                    </div>

                    <div class="flex gap-2 print:hidden">
                        <Button @click="copyToClipboard"
                            >In Zwischenablage</Button
                        >
                        <Button variant="secondary" @click="printSheet"
                            >Drucken</Button
                        >
                    </div>
                </CardContent>
            </Card>
        </div>
    </main>
</template>
