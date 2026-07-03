/** Sanitiza texto livre — remove tags HTML basicas. */

const TAG_RE = /<[^>]*>/g;

export function sanitizePlainText(input: string, maxLen = 5000): string {
  return input.replace(TAG_RE, "").trim().slice(0, maxLen);
}

export function sanitizeName(input: string, maxLen = 120): string {
  return input.replace(TAG_RE, "").trim().slice(0, maxLen);
}
