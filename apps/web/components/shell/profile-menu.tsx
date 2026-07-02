"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, KeyRound, User } from "lucide-react";

type Props = {
  avatarUrl?: string;
  fullName?: string;
};

function profileInitials(fullName?: string): string {
  return (fullName || "")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ProfileMenu({ avatarUrl, fullName }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const topbarIconBtn =
    "flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-900 shadow-sm transition hover:bg-white/90";
  const active =
    pathname === "/profile" ||
    pathname === "/profile/password" ||
    pathname.startsWith("/settings/organization");

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title="Conta"
        aria-label="Menu da conta"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`${topbarIconBtn} ${avatarUrl ? "overflow-hidden p-0" : ""} ${active ? "ring-2 ring-white/50" : ""}`}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : profileInitials(fullName) ? (
          <span className="text-xs font-semibold">{profileInitials(fullName)}</span>
        ) : (
          <User className="h-4 w-4" />
        )}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-1 min-w-[11rem] rounded-lg border border-aurora-border bg-aurora-surface py-1 shadow-lg">
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-aurora-fg hover:bg-aurora-surface-2"
          >
            <User className="h-4 w-4" /> Perfil
          </Link>
          <Link
            href="/profile/password"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-aurora-fg hover:bg-aurora-surface-2"
            data-testid="profile-change-password"
          >
            <KeyRound className="h-4 w-4" /> Mudar senha
          </Link>
          <Link
            href="/settings/organization"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-aurora-fg hover:bg-aurora-surface-2"
            data-testid="profile-org-settings"
          >
            <Building2 className="h-4 w-4" /> Organizacao
          </Link>
        </div>
      ) : null}
    </div>
  );
}
