const backendBaseUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.APP_BACKEND_BASE_URL ||
  "https://sneakshop-production.up.railway.app";
const PROXY_TIMEOUT_MS = 30000;

async function proxyRequest(request: Request, pathParts: string[]) {
  const url = new URL(request.url);
  const target = new URL(`/api/${pathParts.join("/")}${url.search}`, backendBaseUrl);
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");
  headers.delete("connection");
  headers.delete("accept-encoding");

  const method = request.method.toUpperCase();
  const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

  try {
    const upstream = await fetch(target, {
      method,
      headers,
      body,
      cache: "no-store",
      signal: controller.signal,
    });

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: upstream.headers,
    });
  } catch {
    return Response.json(
      {
        status: "error",
        code: 502,
        message: "Backend hiện không phản hồi",
      },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, (await context.params).path);
}

export async function POST(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, (await context.params).path);
}

export async function PUT(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, (await context.params).path);
}

export async function PATCH(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, (await context.params).path);
}

export async function DELETE(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, (await context.params).path);
}

export async function OPTIONS(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, (await context.params).path);
}

export async function HEAD(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, (await context.params).path);
}
