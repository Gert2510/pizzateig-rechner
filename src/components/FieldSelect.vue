<script setup lang="ts">
import { computed, useId } from "vue";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Beschriftetes Select für Zahlenwerte – kapselt die String-Konvertierung. */
const props = defineProps<{
  label: string;
  options: readonly number[];
  /** Anzeige je Option, z.B. `(g) => \`${g} g\``. */
  format?: (value: number) => string;
  placeholder?: string;
}>();

const model = defineModel<number>({ required: true });

const id = useId();

const selected = computed({
  get: () => String(model.value),
  set: (v: string) => (model.value = Number(v)),
});

const label = (v: number) => props.format?.(v) ?? String(v);
</script>

<template>
  <div class="space-y-2">
    <Label :for="id">{{ props.label }}</Label>
    <Select v-model="selected">
      <SelectTrigger :id="id">
        <SelectValue :placeholder="props.placeholder ?? props.label" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem
            v-for="option in props.options"
            :key="option"
            :value="String(option)"
          >
            {{ label(option) }}
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  </div>
</template>
