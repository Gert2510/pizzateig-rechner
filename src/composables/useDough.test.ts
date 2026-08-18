// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";

import { useDough } from "@/composables/useDough";

const d = useDough();

async function set(fn: () => void) {
  fn();
  await nextTick();
  await nextTick();
}

beforeEach(async () => {
  d.reset();
  await nextTick();
  await nextTick();
});

describe("useDough", () => {
  it("startet mit dem Standardrezept", () => {
    expect(d.balls.value).toBe(4);
    expect(d.result.value.totalDoughG).toBe(1120);
    // 300 g Voreinstellung liegen über der 40 %-Regel -> automatisch gekappt.
    expect(d.result.value.poolish?.flourG).toBe(
      Math.floor(d.limits.value.maxFlourG),
    );
  });

  it("begrenzt zu viel Poolish-Mehl automatisch", async () => {
    await set(() => (d.poolishFlourFixedText.value = "900"));

    expect(d.clampInfo.value?.from).toBe(900);
    expect(Number(d.poolishFlourFixedText.value)).toBe(
      Math.floor(d.limits.value.maxFlourG),
    );
    expect(d.result.value.finalMix.waterG).toBeGreaterThan(30);
  });

  it("begrenzt nach, wenn der Teig kleiner wird", async () => {
    await set(() => (d.poolishFlourFixedText.value = "300"));
    await set(() => (d.ballsText.value = "2"));

    expect(Number(d.poolishFlourFixedText.value)).toBeLessThan(300);
    expect(d.result.value.finalMix.waterG).toBeGreaterThanOrEqual(30);
  });

  it("lässt Übermengen zu, wenn Auto-Begrenzen aus ist – warnt aber", async () => {
    await set(() => (d.autoClampPoolish.value = false));
    await set(() => (d.poolishFlourFixedText.value = "900"));

    expect(d.poolishFlourFixedText.value).toBe("900");
    expect(d.poolishTooBig.value).toBe(true);
    expect(d.predictedFinalWaterG.value).toBeLessThan(0);
    // Das Ergebnis bleibt trotzdem physikalisch möglich.
    expect(d.result.value.finalMix.waterG).toBeGreaterThanOrEqual(0);
  });

  it("stellt auf einen passenden Prozentwert um", async () => {
    await set(() => d.switchToPercentThatFits());

    expect(d.poolishMode.value).toBe("percent");
    expect(
      Number(d.poolishPercentText.value.replace(",", ".")),
    ).toBeLessThanOrEqual(d.limits.value.maxPercent + 0.05);
  });

  it("kappt eine zu hohe Prozenteingabe beim Verlassen des Feldes", async () => {
    await set(() => {
      d.poolishMode.value = "percent";
      d.poolishPercentText.value = "80";
    });
    await set(() => d.clampPoolishPercent());

    expect(
      Number(d.poolishPercentText.value.replace(",", ".")),
    ).toBeLessThanOrEqual(40);
  });

  it("rechnet die Germ beim Umschalten der Art um", async () => {
    await set(() => (d.yeastText.value = "3"));
    await set(() => d.setYeastKind("fresh"));

    expect(d.yeastText.value).toBe("9");
    expect(d.result.value.poolish?.yeastG).toBe(9);

    await set(() => d.setYeastKind("dry"));
    expect(d.yeastText.value).toBe("3");
  });

  it("übernimmt Presets inklusive Begrenzung", async () => {
    await set(() => (d.ballsText.value = "2"));
    await set(() => d.applyPoolishPreset(400));

    expect(d.usePoolish.value).toBe(true);
    expect(d.poolishMode.value).toBe("fixed");
    expect(Number(d.poolishFlourFixedText.value)).toBeLessThanOrEqual(
      d.limits.value.maxFlourG + 0.05,
    );
  });

  it("speichert die Eingaben in localStorage", async () => {
    await set(() => (d.ballsText.value = "6"));

    expect(localStorage.getItem("pizzateig:v1")).toContain('"ballsText":"6"');
  });
});
