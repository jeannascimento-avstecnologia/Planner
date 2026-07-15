import { describe, expect, it, vi, afterEach } from "vitest";
import { areRequiredTourTargetsPresent, countMissingTourTargets } from "./tour-targets-ready";
import type { DriveStep } from "driver.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubDocument(html: string) {
  const root = { innerHTML: html } as { innerHTML: string; querySelector: (sel: string) => unknown };
  root.querySelector = (sel: string) => {
    const match = sel.match(/data-tour="([^"]+)"/);
    if (!match) return null;
    return root.innerHTML.includes(`data-tour="${match[1]}"`) ? {} : null;
  };
  vi.stubGlobal("document", root);
}

describe("tour-targets-ready", () => {
  it("ignora passos sem element", () => {
    const steps: DriveStep[] = [{ popover: { title: "Hi" } }];
    expect(countMissingTourTargets(steps)).toBe(0);
    expect(areRequiredTourTargetsPresent(steps)).toBe(true);
  });

  it("detecta seletor ausente", () => {
    stubDocument(`<div data-tour="nav-boards"></div>`);
    const steps: DriveStep[] = [
      { element: '[data-tour="nav-boards"]', popover: { title: "A" } },
      { element: '[data-tour="nav-missing"]', popover: { title: "B" } },
    ];
    expect(countMissingTourTargets(steps)).toBe(1);
    expect(areRequiredTourTargetsPresent(steps)).toBe(false);
  });

  it("ok quando todos os alvos existem", () => {
    stubDocument(`
      <div data-tour="nav-boards"></div>
      <div data-tour="nav-projects"></div>
    `);
    const steps: DriveStep[] = [
      { element: '[data-tour="nav-boards"]', popover: { title: "A" } },
      { element: '[data-tour="nav-projects"]', popover: { title: "B" } },
    ];
    expect(areRequiredTourTargetsPresent(steps)).toBe(true);
  });
});
