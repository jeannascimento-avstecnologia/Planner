import type { HelpSection } from "@/lib/help-content";

export type PageTourStepDef = {
  id: string;
  tourTarget?: string;
  title: string;
  description: string;
  requiresWorkload?: boolean;
  requiresAdmin?: boolean;
};

/** Condensa steps[] do help em frases para popover (max 3 acoes). */
export function condenseHelpSteps(steps: string[], max = 3): string {
  if (steps.length === 0) return "";
  const picked = steps.slice(0, max);
  return picked.join(" ");
}

/** Gera descricao a partir de summary + primeiros passos do help. */
export function helpSectionToTourDescription(section: HelpSection, extraSentence?: string): string {
  const fromSteps = condenseHelpSteps(section.steps, 2);
  const parts = [section.summary];
  if (fromSteps) parts.push(fromSteps);
  if (extraSentence) parts.push(extraSentence);
  return parts.join(" ");
}

export function tourSelector(target: string): string {
  return `[data-tour="${target}"]`;
}
