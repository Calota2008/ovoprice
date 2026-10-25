/** True only for well-formed http(s) URLs. Used before opening any external link. */
export function isSafeHttpUrl(value: string | undefined | null): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}
