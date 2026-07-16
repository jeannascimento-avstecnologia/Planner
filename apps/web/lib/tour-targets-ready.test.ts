import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import {
  areRequiredTourTargetsPresent,
  canAutoStartTour,
  countMissingTourTargets,
  isTourAutoStartReady,
  waitForRequiredTourTargets,
} from "./tour-targets-ready";
import type { DriveStep } from "driver.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function stubDocument(html: string) {
  const root = { innerHTML: html } as { innerHTML: string; querySelector: (sel: string) => unknown };
  root.querySelector = (sel: string) => {
    const match = sel.match(/data-tour="([^"]+)"/);
    if (!match) return null;
    return root.innerHTML.includes(`data-tour="${match[1]}"`) ? {} : null;
  };
  vi.stubGlobal("document", root);
  return root;
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

  it("isTourAutoStartReady exige org + targets", () => {
    stubDocument(`<div data-tour="nav-boards"></div>`);
    const steps: DriveStep[] = [
      { element: '[data-tour="nav-boards"]', popover: { title: "A" } },
    ];
    expect(isTourAutoStartReady(false, steps)).toBe(false);
    expect(isTourAutoStartReady(true, steps)).toBe(true);
    expect(canAutoStartTour(false)).toBe(false);
    expect(canAutoStartTour(true)).toBe(true);
  });
});

describe("waitForRequiredTourTargets", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("retorna true imediatamente se alvos ja presentes", async () => {
    stubDocument(`<div data-tour="nav-boards"></div>`);
    const steps: DriveStep[] = [
      { element: '[data-tour="nav-boards"]', popover: { title: "A" } },
    ];
    await expect(waitForRequiredTourTargets(steps, { maxAttempts: 3 })).resolves.toBe(true);
  });

  it("retry com backoff ate alvos aparecerem", async () => {
    const root = stubDocument(`<div></div>`);
    const steps: DriveStep[] = [
      { element: '[data-tour="nav-boards"]', popover: { title: "A" } },
    ];

    const promise = waitForRequiredTourTargets(steps, {
      maxAttempts: 5,
      initialDelayMs: 100,
      backoffFactor: 2,
    });

    await vi.advanceTimersByTimeAsync(100);
    root.innerHTML = `<div data-tour="nav-boards"></div>`;
    await vi.advanceTimersByTimeAsync(200);

    await expect(promise).resolves.toBe(true);
  });

  it("retorna false ao esgotar tentativas sem marcar completed (caller)", async () => {
    stubDocument(`<div></div>`);
    const steps: DriveStep[] = [
      { element: '[data-tour="nav-missing"]', popover: { title: "A" } },
    ];

    const promise = waitForRequiredTourTargets(steps, {
      maxAttempts: 3,
      initialDelayMs: 50,
      backoffFactor: 2,
    });

    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe(false);
  });

  it("abort signal retorna false sem completed", async () => {
    stubDocument(`<div></div>`);
    const steps: DriveStep[] = [
      { element: '[data-tour="nav-missing"]', popover: { title: "A" } },
    ];
    const controller = new AbortController();

    const promise = waitForRequiredTourTargets(steps, {
      maxAttempts: 8,
      initialDelayMs: 200,
      signal: controller.signal,
    });

    controller.abort();
    await expect(promise).resolves.toBe(false);
  });

  it("isStillEligible false aborta wait", async () => {
    stubDocument(`<div></div>`);
    const steps: DriveStep[] = [
      { element: '[data-tour="nav-missing"]', popover: { title: "A" } },
    ];
    let eligible = true;

    const promise = waitForRequiredTourTargets(steps, {
      maxAttempts: 5,
      initialDelayMs: 100,
      isStillEligible: () => eligible,
    });

    await vi.advanceTimersByTimeAsync(100);
    eligible = false;
    await vi.advanceTimersByTimeAsync(160);

    await expect(promise).resolves.toBe(false);
  });
});
