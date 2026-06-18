import type { Metadata, Viewport } from "next";
import "./globals.css";
import { QueryProvider } from "@/lib/query-provider";
import { ThemeScript } from "@/components/shell/theme-provider";

export const metadata: Metadata = {
  title: "AVS Flow",
  description: "Gestao de projetos multi-tenant, mobile-first.",
  manifest: undefined,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a1145",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
