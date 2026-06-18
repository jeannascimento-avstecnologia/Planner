"use client";

import Image from "next/image";

/** Dimensões nativas de public/branding/avs-logo.png (docs/images/Logo_AVS_Flow.png) */
const LOGO_WIDTH = 4977;
const LOGO_HEIGHT = 614;

type Variant = "topbar" | "sidebar" | "sidebar-collapsed";

type Props = {
  variant?: Variant;
};

type VariantConfig = {
  sizes: string;
  imageClass: string;
  blendScreen?: boolean;
};

const VARIANTS: Record<Variant, VariantConfig> = {
  topbar: {
    sizes: "(max-width: 768px) 260px, 440px",
    imageClass:
      "h-12 w-auto max-w-[min(280px,72vw)] object-contain md:h-[52px] md:max-w-[460px]",
    blendScreen: true,
  },
  sidebar: {
    sizes: "180px",
    imageClass: "h-9 w-auto max-w-[150px] object-contain",
    blendScreen: true,
  },
  "sidebar-collapsed": {
    sizes: "44px",
    imageClass: "h-6 w-auto max-w-[40px] object-contain",
    blendScreen: true,
  },
};

export function AvsLogo({ variant = "topbar" }: Props) {
  const config = VARIANTS[variant];

  return (
    <Image
      src="/branding/avs-logo.png?v=20260618b"
      alt="AVS Flow"
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      priority
      sizes={config.sizes}
      quality={100}
      className={`${config.imageClass}${config.blendScreen ? " mix-blend-screen" : ""}`}
    />
  );
}
