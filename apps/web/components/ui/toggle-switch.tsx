"use client";

import { useId, useState } from "react";

type Props = {
  id?: string;
  /** Envia valor no form quando ligado (checkbox oculto). */
  name?: string;
  formValue?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  "aria-label"?: string;
  testId?: string;
};

export function ToggleSwitch({
  id,
  name,
  formValue = "true",
  checked,
  defaultChecked = false,
  onCheckedChange,
  disabled = false,
  "aria-label": ariaLabel,
  testId,
}: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const isControlled = checked !== undefined;
  const [internal, setInternal] = useState(defaultChecked);
  const on = isControlled ? checked : internal;

  function setOn(next: boolean) {
    if (disabled) return;
    if (!isControlled) setInternal(next);
    onCheckedChange?.(next);
  }

  return (
    <>
      {name ? (
        <input
          type="checkbox"
          id={inputId}
          name={name}
          value={formValue}
          checked={on}
          onChange={(e) => setOn(e.target.checked)}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
        />
      ) : null}
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : inputId}
        disabled={disabled}
        onClick={() => setOn(!on)}
        data-testid={testId}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aurora-accent focus-visible:ring-offset-2 focus-visible:ring-offset-aurora-surface disabled:cursor-not-allowed disabled:opacity-60 ${
          on ? "bg-aurora-accent" : "bg-aurora-border"
        }`}
      >
        <span
          aria-hidden
          className={`pointer-events-none block h-6 w-6 rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform duration-200 ease-out dark:bg-aurora-surface-2 dark:ring-white/10 ${
            on ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </>
  );
}
