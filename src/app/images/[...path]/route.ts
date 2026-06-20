const backendBaseUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.APP_BACKEND_BASE_URL ||
  "https://sneakshop-production.up.railway.app";
const PROXY_TIMEOUT_MS = 7000;

async function proxyImageRequest(request: Request, pathParts: string[]) {
  const url = new URL(request.url);
  const target = new URL(`/images/${pathParts.join("/")}${url.search}`, backendBaseUrl);
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");
  headers.delete("connection");
  headers.delete("accept-encoding");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      cache: "no-store",
      signal: controller.signal,
    });

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: upstream.headers,
    });
  } catch {
    return new Response("Image backend unavailable", { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyImageRequest(request, (await params).path);
}

export async function HEAD(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyImageRequest(request, (await params).path);
}
