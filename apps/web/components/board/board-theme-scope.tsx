"use client";

import { useEffect, useMemo, useState } from "react";
import { deriveBoardThemeVars, type ThemeMode } from "@/lib/board-theme";

type Props = {
  color: string | null;
  children: React.ReactNode;
};

function readThemeMode(): ThemeMode {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function BoardThemeScope({ color, children }: Props) {
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    setMode(readThemeMode());
    const obs = new MutationObserver(() => setMode(readThemeMode()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const style = useMemo(() => deriveBoardThemeVars(color, mode), [color, mode]);

  return (
    <div className="board-theme-scope -m-4 min-h-full p-4 md:-m-4 md:p-4" style={style}>
      {children}
    </div>
  );
}
