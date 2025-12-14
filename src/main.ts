import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";

const THEME_KEY = "theme";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem(THEME_KEY, theme);
}

const saved = localStorage.getItem(THEME_KEY) as Theme | null;
const prefersDark =
  window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;

applyTheme(saved ?? (prefersDark ? "dark" : "light"));

createApp(App).mount("#app");
