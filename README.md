# Pizzateig Rechner

Rechner für neapolitanischen Pizzateig: Teiglinge, Hydration, Poolish, Salz und
Germ – inklusive Küchenzettel zum Kopieren oder Drucken.

## Rezept-Modell

Alle Mengen in Gramm (1 ml Wasser ≈ 1 g):

```
Gesamtteig = Mehl + Wasser + Salz + Honig
Wasser     = Hydration × Mehl
Salz       = 45 g je 1000 ml Wasser
Honig      = 5 g (nur mit Poolish)
```

Daraus folgt `Mehl = (Gesamtteig − Honig) / (1 + Hydration × 1,045)`, so dass die
Summe der Zutaten exakt das gewünschte Teiglingsgewicht ergibt. Germ bleibt
außerhalb der Bilanz (< 0,5 % der Masse).

Der Poolish ist doppelt begrenzt:

- **hart:** nie mehr Wasser im Poolish, als insgesamt vorhanden ist
- **empfohlen:** höchstens 40 % des Gesamtmehls und mindestens 30 g Rest-Wasser
  im Hauptteig (abschaltbar über „Auto begrenzen“)

Die Logik liegt in `src/lib/dough.ts` und ist vollständig durch Tests abgedeckt.

## Entwicklung

```bash
npm install
npm run dev        # Dev-Server
npm run test       # Vitest
npm run check      # Format + Lint + Typen + Tests
npm run build      # Typecheck + Produktions-Build nach dist/
```

## Aufbau

```
src/
  lib/dough.ts        Rezept-Modell (rein, testbar)
  lib/recipe.ts       Küchenzettel- und Anleitungstexte
  lib/format.ts       Zahlen im deutschen Format
  composables/        State (localStorage) und Theme
  components/         Karten der Oberfläche
  components/ui/      shadcn-vue Primitive
```

Die Eingaben werden unter dem Key `pizzateig:v1` im localStorage gesichert.

## Docker

```bash
docker compose up -d --build   # http://localhost:8063
```
