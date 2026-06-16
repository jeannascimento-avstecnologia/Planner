"use client";

import { useState } from "react";
import { COLOR_PRESETS, DEFAULT_BOARD_COLOR } from "@/lib/ui-classes";

type Props = {
  name: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
};

export function ColorPicker({ name, defaultValue = DEFAULT_BOARD_COLOR, onChange }: Props) {
  const [value, setValue] = useState(defaultValue);

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
      <input
        type="color"
        value={value}
        onChange={(e) => set(e.target.value)}
        aria-label="Cor personalizada"
        className="h-6 w-6 cursor-pointer rounded border border-aurora-border bg-transparent"
      />
    </div>
  );
}
