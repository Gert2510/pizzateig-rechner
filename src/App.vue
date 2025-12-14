<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted } from "vue";
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

// ---------- Inputs (Strings, damit tippen funktioniert) ----------
const ballsText = ref("2");

const ballWeightOptions = [200, 230, 250, 270, 280, 300, 320, 350];
const ballWeightG = ref<number>(250);

const hydrationOptions = [55, 58, 60, 62, 65, 68, 70, 72, 75];
const hydrationPct = ref<number>(65);

// Poolish
const usePoolish = ref<boolean>(true);

onMounted(() => {
    nextTick(() => {
        // Trigger ein Update des Switch Components
        usePoolish.value = usePoolish.value;
    });
});

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

const poolishPercentN = computed(() => numOr(poolishPercentText.value, 50));
const poolishFlourFixedN = computed(() =>
    numOr(poolishFlourFixedText.value, 300),
);
const poolishYeastN = computed(() =>
    Math.max(0, numOr(poolishYeastText.value, 0)),
);

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

const result = computed(() =>
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

function setPoolishPreset(flour: number) {
    usePoolish.value = true;
    poolishMode.value = "fixed";
    poolishHydrationPct.value = 100;
    poolishFlourFixedText.value = String(flour);
}

// ---------- Küchenzettel Text ----------
const recipeText = computed(() => {
    const r = result.value;

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
    const r = result.value;
    const poolish = r.poolish;

    const poolishLine = poolish
        ? `Poolish anrühren:
1) ${fmt(poolish.waterG)} Wasser
2) ${fmt(poolish.yeastG)} ${yeastKindLabel.value} darin auflösen
3) ${fmt(poolish.honeyG)} Honig einrühren
4) ${fmt(poolish.flourG)} Mehl dazu, umrühren
5) Zudecken (Frischhaltefolie), oben mit einer Gabel ein paar kleine Löcher machen
6) Mindestens 16 Stunden in den Kühlschrank`
        : `Poolish ist ausgeschaltet.`;

    return `ANLEITUNG
${poolishLine}

Nächster Tag / Hauptteig:
1) Poolish in die Küchenmaschine und einschalten
2) ${fmt(r.finalMix.waterG)} Wasser dazu
3) ${fmt(r.finalMix.flourG)} Mehl dazu
4) Dann ${fmt(r.finalMix.saltG)} zum Schluß Salz dazu
5) Verrühren/kneten bis ein glatter Teig entsteht

Formen & Gehen:
1) Teig falten, kurz formen
2) 15 Minuten rasten lassen
3) Nochmal zu einer schönen Kugel formen
4) 1 Stunde zugedeckt rasten lassen
5) Portionieren: ${ballsN.value} Teiglinge à ${ballWeightG.value} g
6) In eine Teigbox geben und mindestens 2 Stunden zugedeckt gehen lassen

Dann viel Spaß beim Pizza machen!`;
});

const toppingsText = computed(() => {
    return `NEAPOLITANISCHE ZUTATEN (klassisch)
Tomatensoße:
- Ganze Tomaten
- Salz
- Olivenöl
- Basilikum

Belag:
- Parmesan
- Mozzarella
  (Tipp: gut abtropfen lassen, erst in Scheiben, dann Streifen, dann Stücke schneiden)
- Basilikum
- Olivenöl`;
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
                                placeholder="z.B. 50"
                            ></Input>
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
                        class="whitespace-pre-wrap rounded-md border bg-muted p-4 font-mono text-sm print:border-0 print:bg-transparent print:p-0"
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
