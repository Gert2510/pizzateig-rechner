import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Ersatz für @tanstack/vue-table Updater
export type Updater<T> = T | ((old: T) => T);

export function valueUpdater<T>(updaterOrValue: Updater<T>, ref: { value: T }) {
  ref.value =
    typeof updaterOrValue === "function"
      ? (updaterOrValue as (old: T) => T)(ref.value)
      : updaterOrValue;
}
