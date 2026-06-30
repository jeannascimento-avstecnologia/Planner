"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "ngp:theme";

/** Script inline no <head>: define data-theme antes da pintura (evita flash). */
export function ThemeScript() {
  const code = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

type Theme = "light" | "dark";

export function ThemeToggle({ variant = "sidebar" }: { variant?: "sidebar" | "topbar" | "auth" }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const current = (document.documentElement.dataset.theme as Theme) || "light";
    setTheme(current);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
    setTheme(next);
  }

  const Icon = theme === "dark" ? Sun : Moon;
  const label = theme === "dark" ? "Tema claro" : "Tema escuro";

  const isTopbar = variant === "topbar";
  const isAuth = variant === "auth";

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      className={
        isAuth
          ? "flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-aurora-sidebar-fg shadow-sm backdrop-blur-sm transition hover:bg-white/20 hover:text-white"
          : isTopbar
            ? "flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm transition hover:bg-white/90 text-aurora-fg dark:text-gray-900"
            : "flex items-center justify-center rounded-lg p-1.5 text-aurora-sidebar-muted transition hover:bg-white/10 hover:text-aurora-sidebar-fg"
      }
    >
      <Icon className={isAuth ? "h-5 w-5" : "h-4 w-4"} />
    </button>
  );
}
