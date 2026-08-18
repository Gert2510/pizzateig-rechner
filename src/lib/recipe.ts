import type { DoughResult, YeastKind } from "@/lib/dough";
import { formatGram } from "@/lib/format";

export function yeastKindLabel(kind: YeastKind): string {
  return kind === "fresh" ? "Frischgerm" : "Trockengerm";
}

/** Zutatenliste („Küchenzettel“) zum Abhaken beim Abwiegen. */
export function recipeText(r: DoughResult, balls: number, ballWeightG: number) {
  const yeast = yeastKindLabel(r.yeastKind);

  const poolishBlock = r.poolish
    ? [
        `POOLISH (${r.poolish.hydrationPct}%)`,
        `- Wasser: ${formatGram(r.poolish.waterG)}`,
        `- Germ:   ${formatGram(r.poolish.yeastG)} (${yeast})`,
        `- Honig:  ${formatGram(r.poolish.honeyG)}`,
        `- Mehl:   ${formatGram(r.poolish.flourG)}`,
        r.poolish.note ? `Hinweis: ${r.poolish.note}` : null,
      ]
    : ["POOLISH: aus"];

  const finalBlock = [
    "FINAL",
    `- Rest-Wasser: ${formatGram(r.finalMix.waterG)}`,
    `- Rest-Mehl:   ${formatGram(r.finalMix.flourG)}`,
    `- Salz:        ${formatGram(r.finalMix.saltG)}`,
    r.finalMix.yeastG > 0
      ? `- Germ:        ${formatGram(r.finalMix.yeastG)} (${yeast})`
      : null,
    r.finalMix.note ? `Hinweis: ${r.finalMix.note}` : null,
  ];

  return lines([
    "PIZZATEIG REZEPT (Küchenzettel)",
    `Teiglinge: ${balls} × ${ballWeightG} g = ${formatGram(r.totalDoughG)}`,
    `Hydration: ${Math.round((r.waterG / r.flourG) * 100)}%`,
    r.saltRule,
    "",
    "GESAMT",
    `- Mehl:   ${formatGram(r.flourG)}`,
    `- Wasser: ${formatGram(r.waterG)}`,
    `- Salz:   ${formatGram(r.saltG)}`,
    "",
    ...poolishBlock,
    "",
    ...finalBlock,
  ]);
}

/** Schritt-für-Schritt-Anleitung, passend zum gewählten Verfahren. */
export function instructionsText(
  r: DoughResult,
  balls: number,
  ballWeightG: number,
) {
  const yeast = yeastKindLabel(r.yeastKind);
  const p = r.poolish;

  const poolishBlock = p
    ? [
        "POOLISH:",
        `1) Wasser (${formatGram(p.waterG)})`,
        `2) Germ auflösen (${formatGram(p.yeastG)} ${yeast})`,
        `3) Honig einrühren (${formatGram(p.honeyG)})`,
        `4) Mehl dazu (${formatGram(p.flourG)}), umrühren`,
        "5) Folie drauf, mit Gabel Löcher rein",
        "6) mind. 16h Kühlschrank",
        "",
      ]
    : ["POOLISH: aus", ""];

  const mainBlock = p
    ? [
        "HAUPTTEIG:",
        "1) Poolish in Maschine",
        `2) Rest-Wasser (${formatGram(r.finalMix.waterG)})`,
        `3) Rest-Mehl (${formatGram(r.finalMix.flourG)})`,
        `4) Salz (${formatGram(r.finalMix.saltG)}) dazu`,
        "5) Kneten bis glatt",
      ]
    : [
        "HAUPTTEIG:",
        `1) Wasser (${formatGram(r.finalMix.waterG)}) in Maschine`,
        `2) Germ auflösen (${formatGram(r.finalMix.yeastG)} ${yeast})`,
        `3) Mehl (${formatGram(r.finalMix.flourG)})`,
        `4) Salz (${formatGram(r.finalMix.saltG)}) dazu`,
        "5) Kneten bis glatt",
      ];

  return lines([
    "ANLEITUNG",
    ...poolishBlock,
    ...mainBlock,
    "",
    "FORMEN/GEHEN:",
    "- Falten, formen, 15 min rasten",
    "- Nochmal Kugel formen, 1h zugedeckt rasten lassen",
    `- Portionieren: ${balls} × ${ballWeightG} g`,
    "- in Gefäß (Pizzabox), mind. 2h zugedeckt gehen lassen",
  ]);
}

export const TOPPINGS_TEXT = lines([
  "NEAPOLITANISCH (klassisch)",
  "Sauce: ganze Tomaten + Salz + Olivenöl + Basilikum",
  "Belag: Parmesan + Mozzarella (abtropfen, schneiden) + Basilikum + Olivenöl",
]);

/** Kompletter Zettel: Zutaten + Anleitung + Belag. */
export function fullSheetText(
  r: DoughResult,
  balls: number,
  ballWeightG: number,
) {
  return [
    recipeText(r, balls, ballWeightG),
    instructionsText(r, balls, ballWeightG),
    TOPPINGS_TEXT,
  ].join("\n\n");
}

function lines(parts: Array<string | null>) {
  return parts.filter((l) => l !== null).join("\n");
}
