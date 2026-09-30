export const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Media URLs may be relative (/media/..) when Supabase Storage is unavailable. */
export function mediaUrl(u: string | null | undefined): string {
  if (!u) return "";
  return u.startsWith("/media/") ? `${API}${u}` : u;
}

type Opts = { token?: string | null; method?: string; json?: unknown; form?: FormData; signal?: AbortSignal };

type TokenProvider = () => Promise<string | null>;
let tokenProvider: TokenProvider | null = null;
/** Clerk session tokens live about a minute, so requests ask for a fresh one instead of reusing a stored string. */
export function setTokenProvider(fn: TokenProvider | null) {
  tokenProvider = fn;
}

export async function api<T>(path: string, opts: Opts = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.token?.startsWith("dev:")) headers["X-Dev-User"] = opts.token.slice(4); // local development sign-in only
  else if (opts.token) {
    const fresh = tokenProvider ? await tokenProvider() : opts.token;
    if (fresh) headers.Authorization = `Bearer ${fresh}`;
  }
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.json);
  }
  const res = await fetch(`${API}${path}`, {
    method: opts.method ?? (body ? "POST" : "GET"),
    headers,
    body,
    cache: "no-store",
    signal: opts.signal,
  });
  if (!res.ok) {
    let msg = "Something went wrong. Please try again.";
    try {
      const j = await res.json();
      if (typeof j.detail === "string") msg = j.detail;
      else if (Array.isArray(j.detail) && j.detail[0]?.msg) msg = String(j.detail[0].msg);
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, msg);
  }
  return res.json() as Promise<T>;
}

/** For server components: never throws, returns null when the API is unreachable. */
export async function apiSafe<T>(path: string): Promise<T | null> {
  try {
    return await api<T>(path);
  } catch {
    return null;
  }
}

export function qs(params: Record<string, string | number | boolean | string[] | undefined | null>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) v.forEach((x) => u.append(k, x));
    else u.set(k, String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : "";
}
