/** Delay antes do drag iniciar — click rapido abre o card. */
export const KANBAN_DRAG_ACTIVATION_DELAY_MS = 150;

export const KANBAN_DRAG_ACTIVATION_CONSTRAINT = {
  delay: KANBAN_DRAG_ACTIVATION_DELAY_MS,
  tolerance: 5,
} as const;
