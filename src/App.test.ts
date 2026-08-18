// @vitest-environment jsdom
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";

import App from "@/App.vue";
import { useDough } from "@/composables/useDough";

describe("App (Smoke-Test)", () => {
  beforeEach(() => useDough().reset());

  it("rendert den Küchenzettel mit allen Blöcken", async () => {
    const wrapper = mount(App);
    const sheet = wrapper.get("#print-area").text();

    expect(sheet).toContain("PIZZATEIG REZEPT");
    expect(sheet).toContain("POOLISH (100%)");
    expect(sheet).toContain("ANLEITUNG");
  });

  it("reagiert auf Eingaben", async () => {
    const wrapper = mount(App);
    const balls = wrapper.get("input[inputmode='numeric']");

    await balls.setValue("8");

    expect(wrapper.get("#print-area").text()).toContain("Teiglinge: 8 × 280 g");
  });

  it("schaltet den Poolish ab", async () => {
    const dough = useDough();
    const wrapper = mount(App);

    dough.usePoolish.value = false;
    await wrapper.vm.$nextTick();

    expect(wrapper.get("#print-area").text()).toContain("POOLISH: aus");
  });
});
