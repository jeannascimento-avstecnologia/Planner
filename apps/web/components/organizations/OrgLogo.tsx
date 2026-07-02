"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { resolveOrgLogoDisplayUrl } from "@/lib/org-logo-url";

type Props = {
  name: string;
  logoUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
};

const BOX_CLASS: Record<NonNullable<Props["size"]>, string> = {
  xs: "h-6 w-6 rounded-md",
  sm: "h-8 w-8 rounded-lg",
  md: "h-10 w-10 rounded-lg",
  lg: "h-14 w-14 rounded-xl",
};

const FALLBACK_TEXT: Record<NonNullable<Props["size"]>, string> = {
  xs: "text-[10px]",
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
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
      {initials.length <= 2 ? initials : <Building2 className="h-4 w-4" />}
    </span>
  );
}

export function OrgLogo({ name, logoUrl, size = "md", className = "" }: Props) {
  const [broken, setBroken] = useState(false);
  const url = resolveOrgLogoDisplayUrl(logoUrl);

  if (url && !broken) {
    return (
      <span
        className={`${BOX_CLASS[size]} flex shrink-0 items-center justify-center overflow-hidden ${className}`}
        data-testid="org-logo-image-wrap"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={`Logo ${name}`}
          className="max-h-full max-w-full object-contain"
          data-testid="org-logo-image"
          onError={() => setBroken(true)}
        />
      </span>
    );
  }

  return <FallbackLogo name={name} size={size} className={className} />;
}
