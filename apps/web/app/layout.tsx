import type { Metadata, Viewport } from "next";
import "./globals.css";
import { QueryProvider } from "@/lib/query-provider";
import { ThemeScript } from "@/components/shell/theme-provider";
import { AuroraToaster } from "@/components/ui/sonner";
import { PRODUCT_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: PRODUCT_NAME,
  description: "Gestao de projetos multi-tenant, mobile-first.",
  icons: {
    icon: "/favicon.png",
  },
  manifest: undefined,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <QueryProvider>
          {children}
          <AuroraToaster />
        </QueryProvider>
      </body>
    </html>
  );
}
