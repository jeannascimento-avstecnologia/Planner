/** Posicionamento de popovers fixos (portal no body) dentro do viewport. */

export const POPOVER_VIEWPORT_MARGIN = 8;

export type FixedPopoverPosition = {
  top: number;
  left: number;
  flipVertical: boolean;
};

export function computeFixedPopoverPosition(
  triggerRect: DOMRect,
  panelWidth: number,
  panelHeight: number,
): FixedPopoverPosition {
  const margin = POPOVER_VIEWPORT_MARGIN;
  const spaceBelow = window.innerHeight - triggerRect.bottom;
  const flipVertical =
    spaceBelow < panelHeight + margin && triggerRect.top > panelHeight + margin;

  let top = flipVertical ? triggerRect.top - panelHeight - 4 : triggerRect.bottom + 4;
  top = Math.max(margin, Math.min(top, window.innerHeight - panelHeight - margin));

  let left = triggerRect.left;
  if (left + panelWidth > window.innerWidth - margin) {
    left = triggerRect.right - panelWidth;
  }
  left = Math.max(margin, Math.min(left, window.innerWidth - panelWidth - margin));

  return { top, left, flipVertical };
}
