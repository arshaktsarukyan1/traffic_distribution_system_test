import type { NextRequest } from "next/server";

function backendBase(): string {
  const fromEnv = process.env.TDS_BACKEND_URL?.trim().replace(/\/$/, "") ?? "";
  // Default: repo docker-compose exposes Laravel via nginx on host port 80.
  return fromEnv || "http://localhost";
}

async function proxy(req: NextRequest, pathSegments: string[]): Promise<Response> {
  const backend = backendBase();

  const joined = pathSegments.join("/");
  const src = new URL(req.url);
  const target = `${backend}/api/${joined}${src.search}`;
  const headers = new Headers();
  headers.set("Accept", "application/json");
  const incomingAuthorization = req.headers.get("authorization");
  if (incomingAuthorization) {
    headers.set("Authorization", incomingAuthorization);
  }

  const incomingCt = req.headers.get("content-type");
  if (incomingCt) {
    headers.set("Content-Type", incomingCt);
  }

  const method = req.method.toUpperCase();
  const body =
    method === "GET" || method === "HEAD" ? undefined : await req.arrayBuffer();

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method,
      headers,
      body: body && body.byteLength > 0 ? body : undefined,
      cache: "no-store",
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return Response.json(
      {
        message: `Cannot reach Laravel at ${target} (${reason}). Set TDS_BACKEND_URL in frontend/.env.local — e.g. http://localhost for Docker/nginx, or http://127.0.0.1:8000 for php artisan serve.`,
      },
      { status: 502 },
    );
  }

  const out = new Headers();
  const ct = upstream.headers.get("content-type");
  if (ct) {
    out.set("Content-Type", ct);
  }

  if (upstream.status === 401) {
    const hint =
      "Laravel returned 401. Authenticate first via /api/internal/v1/auth/login " +
      "and send the returned Bearer token with subsequent requests.";
    const text = await upstream.text();
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      return Response.json({ ...parsed, hint }, { status: 401, headers: out });
    } catch {
      return Response.json(
        { message: text || "Unauthenticated.", hint },
        { status: 401, headers: out },
      );
    }
  }

  return new Response(upstream.status === 204 ? null : upstream.body, {
    status: upstream.status,
    headers: out,
  });
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}
