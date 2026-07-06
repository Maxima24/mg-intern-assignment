import { env } from '@/lib/env';

/**
 * Typed fetch wrapper for OUR backend. Parses the `{ error: { code, message, details } }`
 * envelope into an ApiError; success responses are returned as-is (no data wrapper).
 * The browser never talks to Setu — only to this base URL.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const BASE = env.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, '');

function url(path: string): string {
  return `${BASE}/${path.replace(/^\//, '')}`;
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const json = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    const err = (json as { error?: { code?: string; message?: string; details?: unknown } })?.error;
    throw new ApiError(
      res.status,
      err?.code ?? 'ERROR',
      err?.message ?? res.statusText ?? 'Request failed',
      err?.details,
    );
  }
  return json as T;
}

export const api = {
  get: <T>(path: string): Promise<T> => fetch(url(path)).then((r) => parse<T>(r)),

  post: <T>(path: string, body?: unknown): Promise<T> =>
    fetch(url(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    }).then((r) => parse<T>(r)),

  // Multipart: never set Content-Type manually — the browser adds the boundary.
  upload: <T>(path: string, form: FormData): Promise<T> =>
    fetch(url(path), { method: 'POST', body: form }).then((r) => parse<T>(r)),
};

/** Absolute URL for direct navigation (e.g. streaming a download through our backend). */
export function apiUrl(path: string): string {
  return url(path);
}
