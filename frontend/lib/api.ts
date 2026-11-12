export const API_BASE: string =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001/api";

const TOKEN_KEY = "upi_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(t: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOKEN_KEY, t);
  } catch {}
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function extractMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const obj = data as Record<string, unknown>;
  if (typeof obj.detail === "string") return obj.detail;
  if (Array.isArray(obj.detail) && obj.detail.length > 0) {
    const first = obj.detail[0] as Record<string, unknown>;
    if (first && typeof first.msg === "string") {
      const loc = Array.isArray(first.loc) ? first.loc[first.loc.length - 1] : "";
      return loc ? `${loc}: ${first.msg}` : first.msg;
    }
  }
  if (typeof obj.message === "string") return obj.message;
  return fallback;
}

export async function api<T = any>(
  path: string,
  opts?: { method?: string; body?: any; auth?: boolean }
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts?.auth !== false) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: opts?.method || "GET",
    headers,
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    throw new ApiError(
      extractMessage(data, `Request failed (${res.status})`),
      res.status
    );
  }

  return data as T;
}
