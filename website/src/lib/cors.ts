import { NextResponse } from 'next/server';

/**
 * Comma-separated allowlist of origins permitted to make cross-origin
 * requests (e.g. a separately-hosted admin web UI).
 *
 * - When set: a request's Origin is reflected back in Access-Control-Allow-Origin
 *   only if it appears in this list.
 * - When unset: falls back to `*` so local development keeps working; production
 *   deployments should set this.
 *
 * Requests that carry no Origin header (the Electron admin app's main-process
 * fetch, server-to-server calls, curl) are not subject to CORS at all — CORS is
 * a browser-only mechanism — so they are unaffected. The real auth gate remains
 * the per-route requireAdmin() check on X-Api-Key.
 */
function getAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS;
  if (!raw) return [];
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

/**
 * Resolve the Access-Control-Allow-Origin value for a given request origin.
 * Returns the origin string if allowlisted, `*` if no allowlist is configured
 * (permissive fallback), or null if the origin is not allowed (browser will
 * block the response).
 */
export function resolveAllowedOrigin(origin: string | null): string | null {
  const allowed = getAllowedOrigins();
  if (allowed.length === 0) return '*';
  if (origin && allowed.includes(origin)) return origin;
  return null;
}

const ALLOW_HEADERS = 'Content-Type, X-Api-Key, X-Admin-Init-Token';
const ALLOW_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';

/**
 * Build a JSON response with CORS headers. Pass the request's `Origin` header
 * value (or null) as the third argument so the allowlist can be enforced.
 *
 * When `origin` is omitted and no allowlist is configured, falls back to the
 * permissive `*` (local-dev behavior). When an allowlist IS configured and no
 * origin is passed, no Access-Control-Allow-Origin is set (browser blocks the
 * cross-origin response) — the preflight handled by proxy.ts is what governs
 * actual cross-origin browser access. Callers that serve cross-origin clients
 * should read the Origin header and pass it explicitly.
 */
export function corsResponse(data: unknown, init?: ResponseInit, origin?: string | null) {
  const res = NextResponse.json(data, init);
  // When no allowlist is set, origin is undefined → resolveAllowedOrigin returns '*'.
  // When an allowlist is set and origin is omitted, resolveAllowedOrigin returns null.
  const allowedOrigin = resolveAllowedOrigin(origin ?? null);
  if (allowedOrigin) {
    res.headers.set('Access-Control-Allow-Origin', allowedOrigin);
  }
  res.headers.set('Access-Control-Allow-Methods', ALLOW_METHODS);
  res.headers.set('Access-Control-Allow-Headers', ALLOW_HEADERS);
  return res;
}

