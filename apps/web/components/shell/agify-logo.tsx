"use client";

import Image from "next/image";
import { PRODUCT_NAME } from "@/lib/brand";

/** Dimensões nativas de public/branding/agify.png (docs/images/Agify.png) */
const LOGO_WIDTH = 714;
const LOGO_HEIGHT = 170;

/** Dimensões nativas de public/branding/agify-icon.png (docs/images/Icon_Agify.png) */
const ICON_WIDTH = 193;
const ICON_HEIGHT = 157;

type Variant = "topbar" | "sidebar" | "sidebar-collapsed" | "auth";

type Props = {
  variant?: Variant;
};

const VARIANTS: Record<Variant, { src: string; width: number; height: number; sizes: string; imageClass: string }> = {
  topbar: {
    src: "/branding/agify.png?v=20260623",
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
    sizes: "(max-width: 768px) 200px, 320px",
    imageClass: "h-12 w-auto max-w-[min(220px,60vw)] object-contain md:h-[52px] md:max-w-[320px]",
  },
  sidebar: {
    src: "/branding/agify.png?v=20260623",
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
    sizes: "180px",
    imageClass: "h-9 w-auto max-w-[150px] object-contain",
  },
  auth: {
    src: "/branding/agify.png?v=20260623",
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
    sizes: "(max-width: 768px) 260px, 380px",
    imageClass: "h-14 w-auto max-w-[min(280px,78vw)] object-contain md:h-[4.5rem] md:max-w-[380px]",
  },
  "sidebar-collapsed": {
    src: "/branding/agify-icon.png?v=20260623",
    width: ICON_WIDTH,
    height: ICON_HEIGHT,
    sizes: "40px",
    imageClass: "h-8 w-8 object-contain",
  },
};

export function AgifyLogo({ variant = "topbar" }: Props) {
  const config = VARIANTS[variant];

  return (
    <span className="inline-block">
      <Image
        src={config.src}
        alt={PRODUCT_NAME}
        width={config.width}
        height={config.height}
        priority
        sizes={config.sizes}
        quality={100}
        className={config.imageClass}
      />
    </span>
  );
}
