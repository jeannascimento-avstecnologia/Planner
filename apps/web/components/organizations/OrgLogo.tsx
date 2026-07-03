"use client";

import { useState } from "react";
import Image from "next/image";
import { Building2 } from "lucide-react";
import { resolveOrgLogoDisplayUrl } from "@/lib/org-logo-url";

type Props = {
  name: string;
  logoUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  priority?: boolean;
};

const BOX_CLASS: Record<NonNullable<Props["size"]>, string> = {
  xs: "h-8 w-8 rounded-md",
  sm: "h-11 w-11 rounded-lg",
  md: "h-14 w-14 rounded-lg",
  lg: "h-20 w-20 rounded-xl",
  xl: "h-28 w-28 rounded-2xl",
};

const IMAGE_SIZE: Record<NonNullable<Props["size"]>, number> = {
  xs: 32,
  sm: 44,
  md: 56,
  lg: 80,
  xl: 112,
};

const FALLBACK_TEXT: Record<NonNullable<Props["size"]>, string> = {
  xs: "text-[11px]",
  sm: "text-xs",
  md: "text-sm",
  lg: "text-lg",
  xl: "text-xl",
};

const FALLBACK_ICON: Record<NonNullable<Props["size"]>, string> = {
  xs: "h-4 w-4",
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-7 w-7",
  xl: "h-9 w-9",
};

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function FallbackLogo({
  name,
  size,
  className,
}: {
  name: string;
  size: NonNullable<Props["size"]>;
  className: string;
}) {
  const initials = initialsFromName(name) || "?";
  return (
    <span
      className={`${BOX_CLASS[size]} ${FALLBACK_TEXT[size]} flex shrink-0 items-center justify-center bg-aurora-accent-muted font-semibold text-aurora-accent ${className}`}
      aria-hidden
      data-testid="org-logo-fallback"
    >
      {initials.length <= 2 ? initials : <Building2 className={FALLBACK_ICON[size]} />}
    </span>
  );
}

export function OrgLogo({ name, logoUrl, size = "md", className = "", priority = false }: Props) {
  const [broken, setBroken] = useState(false);
  const url = resolveOrgLogoDisplayUrl(logoUrl);
  const px = IMAGE_SIZE[size];

  if (url && !broken) {
    return (
      <span
        className={`${BOX_CLASS[size]} relative flex shrink-0 items-center justify-center overflow-hidden ${className}`}
        data-testid="org-logo-image-wrap"
      >
        <Image
          src={url}
          alt={`Logo ${name}`}
          width={px}
          height={px}
          className="h-full w-full object-contain p-0.5"
          data-testid="org-logo-image"
          priority={priority}
          unoptimized={url.startsWith("/api/")}
          onError={() => setBroken(true)}
        />
      </span>
    );
  }

  return <FallbackLogo name={name} size={size} className={className} />;
}
