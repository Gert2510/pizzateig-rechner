<script setup lang="ts">
import { ref } from "vue";
import { Check, Copy, Printer } from "lucide-vue-next";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDough } from "@/composables/useDough";

const { sheetText } = useDough();

type CopyState = "idle" | "copied" | "error";
const copyState = ref<CopyState>("idle");
let resetTimer: ReturnType<typeof setTimeout> | undefined;

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(sheetText.value);
    copyState.value = "copied";
  } catch {
    // z.B. ohne HTTPS oder wenn der Nutzer die Freigabe verweigert
    copyState.value = "error";
  }
  clearTimeout(resetTimer);
  resetTimer = setTimeout(() => (copyState.value = "idle"), 2000);
}

function printSheet() {
  window.print();
}

const copyLabel = {
  idle: "In Zwischenablage",
  copied: "Kopiert!",
  error: "Kopieren nicht möglich",
} satisfies Record<CopyState, string>;
</script>

<template>
  <Card class="md:col-span-2 print:border-0 print:shadow-none">
    <CardHeader class="print:pb-0">
      <CardTitle>Küchenzettel</CardTitle>
      <CardDescription class="print:hidden">
        Kopieren oder drucken
      </CardDescription>
    </CardHeader>

    <CardContent class="space-y-3">
      <div
        id="print-area"
        class="whitespace-pre-line rounded-md border bg-muted p-4 font-mono text-sm print:border-0 print:bg-transparent print:p-0"
      >
        {{ sheetText }}
      </div>

      <div class="flex gap-2 print:hidden">
        <Button @click="copyToClipboard">
          <Check v-if="copyState === 'copied'" aria-hidden="true" />
          <Copy v-else aria-hidden="true" />
          {{ copyLabel[copyState] }}
        </Button>
        <Button variant="secondary" @click="printSheet">
          <Printer aria-hidden="true" />
          Drucken
        </Button>
      </div>

      <p class="sr-only" role="status" aria-live="polite">
        {{
          copyState === "copied" ? "Rezept in die Zwischenablage kopiert" : ""
        }}
      </p>
    </CardContent>
  </Card>
</template>
