/** Sanitiza texto livre — remove tags HTML basicas + control chars. */

const TAG_RE = /<[^>]*>/g;
const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function stripUnsafe(input: string, maxLen: number): string {
  return input.replace(TAG_RE, "").replace(CONTROL_RE, "").trim().slice(0, maxLen);
}

export function sanitizePlainText(input: string, maxLen = 5000): string {
  return stripUnsafe(input, maxLen);
}

export function sanitizeName(input: string, maxLen = 120): string {
  return stripUnsafe(input, maxLen);
}
