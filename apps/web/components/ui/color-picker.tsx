"use client";

import { useRef, useState } from "react";
import { COLOR_PRESETS, DEFAULT_BOARD_COLOR } from "@/lib/ui-classes";

const RAINBOW =
  "conic-gradient(red, #ff0, lime, cyan, blue, magenta, red)";

type Props = {
  name: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
};

export function ColorPicker({ name, defaultValue = DEFAULT_BOARD_COLOR, onChange }: Props) {
  const [value, setValue] = useState(defaultValue);
  const colorInputRef = useRef<HTMLInputElement>(null);

  function set(c: string) {
    setValue(c);
    onChange?.(c);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name={name} value={value} />
      {COLOR_PRESETS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => set(c)}
          aria-label={`Cor ${c}`}
          className={`h-6 w-6 rounded-full transition ${
            value.toLowerCase() === c.toLowerCase()
              ? "ring-2 ring-aurora-accent ring-offset-2 ring-offset-aurora-surface"
              : "border border-aurora-border"
          }`}
          style={{ backgroundColor: c }}
        />
      ))}
      <div className="relative h-7 w-7 shrink-0">
        <button
          type="button"
          aria-label="Cor personalizada"
          onClick={() => colorInputRef.current?.click()}
          className="h-7 w-7 rounded-full p-0.5"
          style={{ background: RAINBOW }}
        >
          <span
            className="block h-full w-full rounded-full border border-white/80"
            style={{ backgroundColor: value }}
          />
        </button>
        <input
          ref={colorInputRef}
          type="color"
          value={value}
          onChange={(e) => set(e.target.value)}
          className="pointer-events-none absolute inset-0 opacity-0"
          tabIndex={-1}
          aria-hidden
        />
      </div>
    </div>
  );
}
