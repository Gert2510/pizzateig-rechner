import { useDark, useToggle } from "@vueuse/core";

/**
 * Light/Dark-Theme. Key und Werte passen zum Inline-Skript in index.html,
 * das das Theme schon vor dem ersten Paint setzt (kein Flackern).
 */
export const isDark = useDark({
  storageKey: "theme",
  valueDark: "dark",
  valueLight: "light",
});

export const toggleTheme = useToggle(isDark);
