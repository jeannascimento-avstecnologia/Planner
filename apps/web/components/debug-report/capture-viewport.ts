import { domToPng } from "modern-screenshot";

declare global {
  interface Window {
    __NGP_DEBUG_SCREENSHOT__?: string;
  }
}

export async function captureViewportScreenshot(): Promise<string> {
  if (typeof window !== "undefined" && window.__NGP_DEBUG_SCREENSHOT__) {
    return window.__NGP_DEBUG_SCREENSHOT__;
  }
  const dataUrl = await domToPng(document.documentElement, {
    quality: 0.85,
    scale: window.devicePixelRatio || 1,
  });
  return dataUrl;
}
