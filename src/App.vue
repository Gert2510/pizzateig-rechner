<script setup lang="ts">
import { computed, ref, watch } from "vue";
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

const isDark = ref(false);

// beim Start: aus localStorage oder default false
const saved = localStorage.getItem("theme");
isDark.value = saved === "dark";

watch(
    isDark,
    (v) => {
        document.documentElement.classList.toggle("dark", v);
        localStorage.setItem("theme", v ? "dark" : "light");
    },
    { immediate: true },
);

// ------- helpers (DE-kompatibel: Komma als Dezimaltrenner) -------
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

// ------- state (Inputs als Strings, damit Tippen nicht “blockiert”) -------
const ballsText = ref("8");

const ballWeightOptions = [200, 230, 250, 270, 280, 300, 320, 350];
const ballWeightG = ref<number>(280);

const hydrationOptions = [55, 58, 60, 62, 65, 68, 70, 72, 75];
const hydrationPct = ref<number>(68);

// Poolish
const usePoolish = ref<boolean>(true);
const poolishMode = ref<PoolishMode>("fixed");

const poolishPercentText = ref("50");
const poolishFlourFixedText = ref("300");
const poolishHydrationPct = ref<number>(100);

// Germ nur im Poolish (Gramm)
const poolishYeastText = ref("5");

// ------- parsed values for calculations -------
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

function fmt(g: number) {
    return `${g.toFixed(1)} g`;
}

const summaryText = computed(() => {
    const r = result.value;

    const poolishBlock = r.poolish
        ? `POOLISH (${r.poolish.hydrationPct}%)
    - Mehl:   ${fmt(r.poolish.flourG)}
    - Wasser: ${fmt(r.poolish.waterG)}
    - Honig:  ${fmt(r.poolish.honeyG)}
    - Germ:   ${fmt(r.poolish.yeastG)}
    ${r.poolish.note ? `Hinweis: ${r.poolish.note}\n` : ""}`
        : `POOLISH: aus\n`;

    return `PIZZATEIG REZEPT (printable)

Teiglinge: ${ballsN.value} × ${ballWeightG.value} g = ${fmt(r.totalDoughG)}
Hydration: ${hydrationPct.value}%
${r.saltRule}

GESAMT
- Mehl:   ${fmt(r.flourG)}
- Wasser: ${fmt(r.waterG)}
- Salz:   ${fmt(r.saltG)}

${poolishBlock}
FINAL
- Rest-Mehl:   ${fmt(r.finalMix.flourG)}
- Rest-Wasser: ${fmt(r.finalMix.waterG)}
- Salz:        ${fmt(r.finalMix.saltG)}
${r.finalMix.note ? `Hinweis: ${r.finalMix.note}\n` : ""}`.trim();
});

async function copyToClipboard() {
    await navigator.clipboard.writeText(summaryText.value);
}

function printSheet() {
    window.print();
}

function setPoolishPreset(flour: number) {
    usePoolish.value = true;
    poolishMode.value = "fixed";
    poolishHydrationPct.value = 100;
    poolishFlourFixedText.value = String(flour);
}
</script>

<template>
    <main class="mx-auto max-w-3xl px-4 py-10">
        <header class="mb-6 print:hidden">
            <div class="flex items-start justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-semibold">Pizzateig Rechner</h1>
                    <p class="mt-1 text-sm text-muted-foreground">
                        Salz ist fix (45 g / 1000 ml Wasser). Germ nur im
                        Poolish (g). Honig fix 5 g im Poolish.
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
                        <p class="text-xs text-muted-foreground">
                            Tipp: einfach eintippen (keine Pfeile nötig).
                        </p>
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
                    <CardDescription
                        >Optionaler Vorteig (z.B. 300/300)</CardDescription
                    >
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

                        <div class="space-y-2">
                            <Label>Germ im Poolish (g)</Label>
                            <Input
                                v-model="poolishYeastText"
                                type="text"
                                inputmode="decimal"
                                placeholder="z.B. 0,3"
                            ></Input>
                            <p class="text-xs text-muted-foreground">
                                Germ wird nur im Poolish gerechnet. Komma geht
                                auch (z.B. 0,3).
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
                        {{ summaryText }}
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
