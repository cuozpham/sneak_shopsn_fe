export const toFrontendImageUrl = (url: string | null | undefined) => {
  if (!url) return "";

  const trimmed = url.trim();
  if (!trimmed) return "";

  const backendBaseUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.APP_BACKEND_BASE_URL ||
    "https://sneakshop-production.up.railway.app";

  try {
    const parsed = new URL(trimmed);
    if (parsed.pathname.startsWith("/images/")) {
      return `${backendBaseUrl}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return trimmed;
  } catch {
    if (trimmed.startsWith("/images/")) {
      return `${backendBaseUrl}${trimmed}`;
    }
    return trimmed;
  }
};
