"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  getSessionLogSnapshot,
  installSessionLogCollector,
  recordNavigation,
  uninstallSessionLogCollector,
  type DebugReportApp,
  type SessionLogEvent,
} from "@/lib/debug-report";
import { ACTIVE_ORG_COOKIE } from "@/lib/active-org-constants";
import { appToast } from "@/lib/toast";
import { captureViewportScreenshot } from "./capture-viewport";
import { installApiErrorLogging } from "./install-api-error-logging";
import { submitDebugReport } from "./submit-debug-report";
import { DebugReportDialog } from "./debug-report-dialog";

type DebugReportContextValue = {
  openReport: () => void;
  isPreparing: boolean;
};

const DebugReportContext = createContext<DebugReportContextValue | null>(null);

export function useDebugReportTrigger(): DebugReportContextValue {
  const context = use(DebugReportContext);
  if (!context) {
    throw new Error("useDebugReportTrigger must be used within DebugReportProvider");
  }
  return context;
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const parts = document.cookie.split("; ");
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const key = decodeURIComponent(part.slice(0, eq));
    if (key === name) return decodeURIComponent(part.slice(eq + 1));
  }
  return undefined;
}

type Props = {
  children: ReactNode;
  app: DebugReportApp;
};

export function DebugReportProvider({ children, app }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [sessionLog, setSessionLog] = useState<SessionLogEvent[]>([]);

  useEffect(() => {
    installSessionLogCollector();
    const supabaseHost = (() => {
      try {
        return process.env.NEXT_PUBLIC_SUPABASE_URL
          ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
          : "";
      } catch {
        return "";
      }
    })();
    const uninstallApiLogging = installApiErrorLogging(["/api/", supabaseHost]);
    return () => {
      uninstallSessionLogCollector();
      uninstallApiLogging();
    };
  }, []);

  useEffect(() => {
    recordNavigation(pathname);
  }, [pathname]);

  const openReport = useCallback(async () => {
    if (isPreparing || open) return;
    setIsPreparing(true);
    try {
      const [screenshot, log] = await Promise.all([
        captureViewportScreenshot(),
        Promise.resolve(getSessionLogSnapshot()),
      ]);
      setScreenshotDataUrl(screenshot);
      setSessionLog(log);
      setOpen(true);
    } catch {
      appToast.error("Não foi possível capturar a tela. Tente novamente.");
    } finally {
      setIsPreparing(false);
    }
  }, [isPreparing, open]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "d" || !event.shiftKey || !(event.metaKey || event.ctrlKey)) {
        return;
      }
      event.preventDefault();
      void openReport();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openReport]);

  const handleSubmit = useCallback(
    (values: { title: string; description: string; notes?: string }) => {
      if (!screenshotDataUrl) return;
      startTransition(async () => {
        try {
          const workspace = readCookie(ACTIVE_ORG_COOKIE);
          await submitDebugReport({
            ...values,
            screenshotBase64: screenshotDataUrl,
            sessionLog,
            clientMeta: {
              url: window.location.href,
              userAgent: navigator.userAgent,
              viewport: { width: window.innerWidth, height: window.innerHeight },
              app,
              workspace,
            },
          });
          appToast.success("Relatório enviado. Obrigado!");
          setOpen(false);
          setScreenshotDataUrl(null);
          setSessionLog([]);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Falha ao enviar relatório.";
          appToast.error(message);
        }
      });
    },
    [app, screenshotDataUrl, sessionLog],
  );

  const value = useMemo(
    () => ({ openReport: () => void openReport(), isPreparing }),
    [isPreparing, openReport],
  );

  return (
    <DebugReportContext value={value}>
      {children}
      <DebugReportDialog
        open={open}
        onOpenChange={setOpen}
        screenshotDataUrl={screenshotDataUrl}
        sessionLog={sessionLog}
        isSubmitting={isPending}
        onSubmit={handleSubmit}
      />
    </DebugReportContext>
  );
}
