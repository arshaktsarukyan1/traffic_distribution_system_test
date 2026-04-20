import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { NextRequest } from "next/server";

function backendBase(): string {
  const fromEnv = process.env.TDS_BACKEND_URL?.trim().replace(/\/$/, "") ?? "";
  // Default: repo docker-compose exposes Laravel via nginx on host port 80.
  return fromEnv || "http://localhost";
}

function parseDotenvValue(raw: string, key: string): string {
  const lines = raw.split(/\r?\n/);
  const prefix = `${key}=`;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }
    if (!trimmed.startsWith(prefix)) {
      continue;
    }
    let v = trimmed.slice(prefix.length).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    return v.trim();
  }
  return "";
}

/**
 * When running `next dev` from ./frontend, pick up the same token Laravel uses if
 * the dashboard env was not duplicated into frontend/.env.local.
 */
function tokenFromBackendDotenv(): string {
  if (process.env.NODE_ENV !== "development") {
    return "";
  }
  const candidates = [
    join(process.cwd(), "..", "backend", ".env"),
    join(process.cwd(), "backend", ".env"),
  ];
  for (const p of candidates) {
    if (!existsSync(p)) {
      continue;
    }
    try {
      const parsed = parseDotenvValue(readFileSync(p, "utf8"), "INTERNAL_API_TOKEN");
      if (parsed !== "") {
        return parsed;
      }
    } catch {
      // ignore
    }
  }
  return "";
}

function internalToken(): string {
  return (
    process.env.TDS_INTERNAL_API_TOKEN?.trim() ||
    process.env.INTERNAL_API_TOKEN?.trim() ||
    tokenFromBackendDotenv() ||
    ""
  );
}

async function proxy(req: NextRequest, pathSegments: string[]): Promise<Response> {
  const backend = backendBase();
  const token = internalToken();

  if (!token) {
    return Response.json(
      {
        message:
          "Set TDS_INTERNAL_API_TOKEN (or INTERNAL_API_TOKEN) for the dashboard proxy, e.g. in frontend/.env.development — it must match backend INTERNAL_API_TOKEN.",
      },
      { status: 503 },
    );
  }

  const joined = pathSegments.join("/");
  const src = new URL(req.url);
  const target = `${backend}/api/${joined}${src.search}`;
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");

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
      "Laravel returned 401: the proxy Bearer token must exactly match backend INTERNAL_API_TOKEN. " +
      "Set TDS_INTERNAL_API_TOKEN in frontend/.env.local, or in development rely on backend/.env (read automatically), " +
      "or align frontend/.env.development with your backend token.";
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
