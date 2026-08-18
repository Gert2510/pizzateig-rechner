<script setup lang="ts">
import BasicsCard from "@/components/BasicsCard.vue";
import PoolishCard from "@/components/PoolishCard.vue";
import RecipeSheet from "@/components/RecipeSheet.vue";
import ThemeToggle from "@/components/ThemeToggle.vue";
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

        <ThemeToggle />
      </div>
    </header>

    <div class="grid gap-4 md:grid-cols-2">
      <BasicsCard />
      <PoolishCard />
      <RecipeSheet />
    </div>
  </main>
</template>
