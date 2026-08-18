<script setup lang="ts">
import { useId } from "vue";

import FieldSelect from "@/components/FieldSelect.vue";
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

import {
  BALL_WEIGHT_OPTIONS,
  HYDRATION_OPTIONS,
  useDough,
} from "@/composables/useDough";
import { formatGram } from "@/lib/format";

const { ballsText, ballWeightG, hydrationPct, result } = useDough();

const ballsId = useId();
</script>

<template>
  <Card class="print:hidden">
    <CardHeader>
      <CardTitle>Basics</CardTitle>
      <CardDescription>Teiglinge, Grammatur, Hydration</CardDescription>
    </CardHeader>

    <CardContent class="space-y-4">
      <div class="space-y-2">
        <Label :for="ballsId">Teiglinge</Label>
        <Input
          :id="ballsId"
          v-model="ballsText"
          type="text"
          inputmode="numeric"
          autocomplete="off"
          placeholder="z.B. 4"
        />
      </div>

      <FieldSelect
        v-model="ballWeightG"
        label="Teigling-Grammatur"
        placeholder="Wähle Grammatur"
        :options="BALL_WEIGHT_OPTIONS"
        :format="(g) => `${g} g`"
      />

      <FieldSelect
        v-model="hydrationPct"
        label="Hydration"
        placeholder="Wähle Hydration"
        :options="HYDRATION_OPTIONS"
        :format="(h) => `${h}%`"
      />

      <Separator />

      <div class="space-y-1 text-sm text-muted-foreground">
        <p>
          Salz wird automatisch berechnet:
          <span class="font-medium">45 g pro 1000 ml Wasser</span>.
        </p>
        <p aria-live="polite">
          Gesamtteig:
          <span class="font-medium">{{ formatGram(result.totalDoughG) }}</span>
          · Mehl:
          <span class="font-medium">{{ formatGram(result.flourG) }}</span> ·
          Wasser:
          <span class="font-medium">{{ formatGram(result.waterG) }}</span>
        </p>
      </div>
    </CardContent>
  </Card>
</template>
