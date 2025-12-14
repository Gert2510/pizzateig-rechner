<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { computed, ref, watch } from "vue";
import { SwitchRoot, SwitchThumb } from "reka-ui";
import { cn } from "@/lib/utils";

/**
 * Kompatibilität:
 * - unterstützt v-model (modelValue / update:modelValue)
 * - unterstützt v-model:checked (checked / update:checked)
 * - fängt beide Update-Events von reka-ui ab
 */
const props = withDefaults(
    defineProps<{
        checked?: boolean;
        modelValue?: boolean;
        defaultChecked?: boolean;
        disabled?: boolean;
        required?: boolean;
        name?: string;
        value?: string;
        id?: string;
        class?: HTMLAttributes["class"];
    }>(),
    {
        defaultChecked: false,
    },
);

const emit = defineEmits<{
    (e: "update:checked", v: boolean): void;
    (e: "update:modelValue", v: boolean): void;
    (e: "change", v: boolean): void;
}>();

// interner State für den Fall, dass kein controlled prop gesetzt ist
const internal = ref<boolean>(props.defaultChecked);

// Sync: wenn Parent "checked" oder "modelValue" liefert, übernehmen
watch(
    () => [props.checked, props.modelValue] as const,
    ([c, m]) => {
        if (typeof c === "boolean") internal.value = c;
        else if (typeof m === "boolean") internal.value = m;
    },
    { immediate: true },
);

const bridged = computed<boolean>({
    get() {
        if (typeof props.checked === "boolean") return props.checked;
        if (typeof props.modelValue === "boolean") return props.modelValue;
        return internal.value;
    },
    set(v: boolean) {
        internal.value = v;
        emit("update:checked", v);
        emit("update:modelValue", v);
        emit("change", v);
    },
});

function onUpdate(v: boolean) {
    bridged.value = v;
}
</script>

<template>
    <SwitchRoot
        :checked="bridged"
        :disabled="disabled"
        :required="required"
        :name="name"
        :value="value"
        :id="id"
        @update:checked="onUpdate"
        @update:modelValue="onUpdate"
        :class="
            cn(
                'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
                props.class,
            )
        "
    >
        <SwitchThumb
            :class="
                cn(
                    'pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0',
                )
            "
        />
    </SwitchRoot>
</template>
