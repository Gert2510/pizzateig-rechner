<script setup lang="ts">
import { useId } from "vue";

import FieldSelect from "@/components/FieldSelect.vue";
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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  POOLISH_HYDRATION_OPTIONS,
  POOLISH_PRESETS_G,
  useDough,
} from "@/composables/useDough";
import {
  MIN_FINAL_WATER_G,
  POOLISH_PCT_CAP,
  POOLISH_PCT_RECOMMENDED,
} from "@/lib/dough";
import { formatGram, formatNumberDE } from "@/lib/format";

const {
  usePoolish,
  poolishMode,
  poolishPercentText,
  poolishFlourFixedText,
  poolishHydrationPct,
  yeastText,
  yeastKind,
  autoClampPoolish,
  percentFieldFocused,
  limits,
  requestedPoolishFlourG,
  predictedFinalWaterG,
  poolishTooBig,
  finalWaterTooLow,
  clampInfo,
  setPoolishToMax,
  switchToPercentThatFits,
  applyPoolishPreset,
  clampPoolishPercent,
  setYeastKind,
} = useDough();

const modeId = useId();
const flourId = useId();
const percentId = useId();
const yeastId = useId();
</script>

<template>
  <Card class="print:hidden">
    <CardHeader>
      <CardTitle>Poolish</CardTitle>
      <CardDescription>Vorteig – empfohlen</CardDescription>
    </CardHeader>

    <CardContent class="space-y-4">
      <div class="flex items-center justify-between gap-4">
        <div class="space-y-1">
          <div class="text-sm font-medium">Poolish verwenden</div>
          <div class="text-xs text-muted-foreground">
            Vorteig für mehr Aroma und Bekömmlichkeit
          </div>
        </div>
        <Switch v-model="usePoolish" aria-label="Poolish verwenden" />
      </div>

      <fieldset
        class="space-y-4 transition-opacity"
        :class="usePoolish ? '' : 'opacity-50'"
        :disabled="!usePoolish"
        :inert="!usePoolish"
      >
        <FieldSelect
          v-model="poolishHydrationPct"
          label="Poolish Hydration"
          placeholder="Hydration"
          :options="POOLISH_HYDRATION_OPTIONS"
          :format="(h) => `${h}%`"
        />

        <div class="space-y-2">
          <Label :for="modeId">Poolish-Modus</Label>
          <Select v-model="poolishMode">
            <SelectTrigger :id="modeId">
              <SelectValue placeholder="Modus" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="fixed">
                  Fix (g Mehl) – z.B. 300/300
                </SelectItem>
                <SelectItem value="percent">
                  Anteil (%) vom Gesamtmehl
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div v-if="poolishMode === 'fixed'" class="space-y-2">
          <Label :for="flourId">Poolish Mehl (g)</Label>
          <Input
            :id="flourId"
            v-model="poolishFlourFixedText"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            placeholder="z.B. 300"
            :aria-invalid="poolishTooBig || undefined"
          />

          <div
            v-if="poolishTooBig || finalWaterTooLow || clampInfo"
            role="status"
            aria-live="polite"
            class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="font-medium">Poolish Hinweis</div>
              <Button
                v-if="clampInfo"
                variant="ghost"
                size="xs"
                @click="clampInfo = null"
              >
                OK
              </Button>
            </div>

            <div class="mt-1 space-y-1 text-xs opacity-90">
              <p v-if="clampInfo">
                Auto begrenzt:
                <span class="font-semibold">{{
                  formatGram(clampInfo.from)
                }}</span>
                →
                <span class="font-semibold">{{
                  formatGram(clampInfo.to)
                }}</span>
                (damit der Hauptteig noch Wasser zum Kneten hat).
              </p>

              <p>
                Empfohlenes Maximum bei {{ poolishHydrationPct }}%
                Poolish-Hydration:
                <span class="font-semibold">{{
                  formatGram(limits.maxFlourG)
                }}</span>
                (≤ {{ POOLISH_PCT_CAP }}% vom Gesamtmehl, Final-Wasser ≥
                {{ MIN_FINAL_WATER_G }} g).
              </p>

              <p>
                Du hast
                <span class="font-semibold">{{
                  formatGram(requestedPoolishFlourG)
                }}</span>
                gewählt → Final-Wasser wäre
                <span class="font-semibold">{{
                  formatGram(predictedFinalWaterG)
                }}</span
                >.
              </p>
            </div>

            <div class="mt-3 flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" @click="setPoolishToMax">
                Auf Max setzen
              </Button>
              <Button
                variant="secondary"
                size="sm"
                @click="switchToPercentThatFits"
              >
                Auf % umstellen
              </Button>

              <div class="ml-auto flex items-center gap-2">
                <span class="text-xs opacity-80">Auto begrenzen</span>
                <Switch
                  v-model="autoClampPoolish"
                  aria-label="Poolish automatisch begrenzen"
                />
              </div>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <Button
              v-for="preset in POOLISH_PRESETS_G"
              :key="preset"
              variant="secondary"
              size="sm"
              @click="applyPoolishPreset(preset)"
            >
              {{ preset }}/{{ preset }}
            </Button>
          </div>
        </div>

        <div v-else class="space-y-2">
          <Label :for="percentId">Poolish Anteil (% vom Gesamtmehl)</Label>
          <Input
            :id="percentId"
            v-model="poolishPercentText"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            placeholder="z.B. 35"
            @focus="percentFieldFocused = true"
            @blur="
              percentFieldFocused = false;
              clampPoolishPercent();
            "
          />
          <p class="text-xs text-muted-foreground">
            Empfehlung: {{ POOLISH_PCT_RECOMMENDED }}%. Max erlaubt:
            {{ formatNumberDE(limits.maxPercent, 1) }}%.
          </p>
        </div>
      </fieldset>

      <Separator />

      <div class="flex items-center justify-between gap-4">
        <div class="space-y-1">
          <div class="text-sm font-medium">Germ-Art</div>
          <div class="text-xs text-muted-foreground">
            Trocken ↔ Frisch (Umrechnung 1:3)
          </div>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-xs text-muted-foreground">Trocken</span>
          <Switch
            :model-value="yeastKind === 'fresh'"
            aria-label="Frischgerm statt Trockengerm verwenden"
            @update:model-value="setYeastKind($event ? 'fresh' : 'dry')"
          />
          <span class="text-xs text-muted-foreground">Frisch</span>
        </div>
      </div>

      <div class="space-y-2">
        <Label :for="yeastId">
          Germ {{ usePoolish ? "im Poolish" : "im Hauptteig" }} (g)
        </Label>
        <Input
          :id="yeastId"
          v-model="yeastText"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          placeholder="z.B. 3"
        />
        <p class="text-xs text-muted-foreground">
          Beim Umschalten der Germ-Art wird automatisch umgerechnet.
        </p>
      </div>
    </CardContent>
  </Card>
</template>
