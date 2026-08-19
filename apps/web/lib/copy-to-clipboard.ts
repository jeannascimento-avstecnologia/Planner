/** Copia texto com fallback para execCommand quando clipboard API falha (ex.: apos await). */
export async function copyToClipboard(
  text: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!text) return { ok: false, reason: "empty" };

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return { ok: true };
    } catch {
      // Perde user activation apos await — tenta fallback abaixo.
    }
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copied ? { ok: true } : { ok: false, reason: "execCommand_failed" };
  } catch {
    return { ok: false, reason: "fallback_exception" };
  }
}
