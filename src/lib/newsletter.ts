/** Accept only publication origins; derive embeds and subscription paths here. */
export function normalizeSubstackUrl(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.port || url.username || url.password ||
      !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.substack\.com$/.test(url.hostname)) return null;
    return url.origin;
  } catch { return null; }
}

export function validGoogleVerification(value: string): boolean {
  return /^[A-Za-z0-9_-]{10,256}$/.test(value);
}
