/**
 * Zahlen-Ein-/Ausgabe im deutschen Format (Komma als Dezimaltrenner).
 */

const DECIMAL_FORMATTERS = new Map<number, Intl.NumberFormat>();

function formatter(maximumFractionDigits: number): Intl.NumberFormat {
  let f = DECIMAL_FORMATTERS.get(maximumFractionDigits);
  if (!f) {
    f = new Intl.NumberFormat("de-DE", {
      maximumFractionDigits,
      useGrouping: false,
    });
    DECIMAL_FORMATTERS.set(maximumFractionDigits, f);
  }
  return f;
}

/**
 * Parst Nutzereingaben wie "1,5", "1.5" oder " 300 ".
 * Gibt `null` zurück, wenn das Feld leer oder keine endliche Zahl ist.
 */
export function parseNumberDE(raw: string | null | undefined): number | null {
  const s = (raw ?? "").trim().replace(/\s/g, "").replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Wie {@link parseNumberDE}, aber mit Fallback statt `null`. */
export function numOr(raw: string, fallback: number): number {
  return parseNumberDE(raw) ?? fallback;
}

/** Wie {@link numOr}, schneidet aber auf eine ganze Zahl ab. */
export function intOr(raw: string, fallback: number): number {
  const n = parseNumberDE(raw);
  return n === null ? fallback : Math.trunc(n);
}

/**
 * Formatiert eine Zahl mit Komma und ohne überflüssige Nullen.
 * `formatNumberDE(1.5)` -> "1,5", `formatNumberDE(300)` -> "300".
 */
export function formatNumberDE(n: number, maxDecimals = 3): string {
  if (!Number.isFinite(n)) return "";
  return formatter(Math.max(0, maxDecimals)).format(n);
}

/** Gramm-Ausgabe für Küchenzettel und Warnungen: "281,3 g". */
export function formatGram(g: number, decimals = 1): string {
  return `${formatNumberDE(g, decimals)} g`;
}
