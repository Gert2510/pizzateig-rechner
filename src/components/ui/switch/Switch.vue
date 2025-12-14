<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { computed } from "vue";
import { SwitchRoot, SwitchThumb } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<{
    checked?: boolean;
    modelValue?: boolean;
    defaultChecked?: boolean;
    disabled?: boolean;
    required?: boolean;
    name?: string;
    value?: string;
    id?: string;
    class?: HTMLAttributes["class"];
}>();

const emit = defineEmits<{
    (e: "update:checked", v: boolean): void;
    (e: "update:modelValue", v: boolean): void;
}>();

// Einfacher computed - kein interner State!
const isChecked = computed(() => {
    // Priorität: checked > modelValue > defaultChecked
    return props.checked ?? props.modelValue ?? props.defaultChecked ?? false;
});

function handleUpdate(value: boolean) {
    emit("update:checked", value);
    emit("update:modelValue", value);
}
</script>

<template>
    <SwitchRoot
        :model-value="isChecked"
        @update:model-value="handleUpdate"
        :disabled="disabled"
        :required="required"
        :name="name"
        :value="value"
        :id="id"
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
