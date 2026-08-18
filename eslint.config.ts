import js from "@eslint/js";
import pluginVue from "eslint-plugin-vue";
import {
  defineConfigWithVueTs,
  vueTsConfigs,
} from "@vue/eslint-config-typescript";
import skipFormatting from "@vue/eslint-config-prettier/skip-formatting";

export default defineConfigWithVueTs(
  { name: "app/files", files: ["**/*.{ts,mts,tsx,vue}"] },
  { name: "app/ignores", ignores: ["dist/**", "node_modules/**"] },
  js.configs.recommended,
  pluginVue.configs["flat/recommended"],
  vueTsConfigs.recommended,
  skipFormatting,
  {
    rules: {
      "vue/multi-word-component-names": "off",
      // Optionale Props sind über die TS-Typen bereits eindeutig.
      "vue/require-default-prop": "off",
    },
  },
);
