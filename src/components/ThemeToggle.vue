<script setup lang="ts">
import { Moon, Sun } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { isDark, toggleTheme } from "@/composables/useTheme";
</script>

<template>
  <Button
    variant="ghost"
    size="icon"
    :aria-label="
      isDark ? 'Zu hellem Design wechseln' : 'Zu dunklem Design wechseln'
    "
    :aria-pressed="isDark"
    @click="toggleTheme()"
  >
    <Moon v-if="isDark" class="h-4 w-4" aria-hidden="true" />
    <Sun v-else class="h-4 w-4" aria-hidden="true" />
  </Button>
</template>
