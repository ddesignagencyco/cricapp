import { API_URL, REQUEST_TIMEOUT_MS } from '../config';

const unreachable = __DEV__
  ? `Can't reach the API at ${API_URL}. Is the backend running?`
  : 'Unable to reach the server. Check your connection and try again.';

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

/** Nest returns `message` as a string, or a string[] for validation errors. */
function messageFrom(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const msg = (body as { message: unknown }).message;
    if (Array.isArray(msg) && msg.length > 0) return String(msg[0]);
    if (typeof msg === 'string' && msg) return msg;
  }
  if (status === 429)
    return 'Too many attempts. Please wait a minute and try again.';
  if (status >= 500)
    return 'Something went wrong on our side. Please try again.';
  return `Request failed (${status})`;
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export type Query = Record<
  string,
  string | number | boolean | null | undefined
>;

/** `/news` + `{ page: 2, q: undefined }` → `/news?page=2`. */
export function withQuery(path: string, query?: Query): string {
  if (!query) return path;
  const parts = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(
      ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
    );
  return parts.length
    ? `${path}${path.includes('?') ? '&' : '?'}${parts.join('&')}`
    : path;
}

/** Path segment for provider ids such as `sr:match:123`. */
export const seg = (id: string) => encodeURIComponent(id);

/**
 * The API authenticates with an HttpOnly cookie set by POST /auth/login.
 * React Native's native networking stack stores and resends that cookie
 * (and persists it across launches), so `credentials: 'include'` is all
 * that is needed — no token storage library required.
 */
async function request<T>(
  method: Method,
  path: string,
  body?: unknown,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      method,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    throw new ApiError(
      0,
      aborted && !__DEV__
        ? 'The server took too long to respond. Check your connection and try again.'
        : unreachable,
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let parsed: unknown;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, messageFrom(parsed, res.status), parsed);
  }
  return parsed as T;
}

export const api = {
  get: <T>(path: string, query?: Query, timeoutMs?: number) =>
    request<T>('GET', withQuery(path, query), undefined, timeoutMs),
  /** Like `get`, but a 404 is an answer ("none"), not an error. */
  optional: async <T>(path: string, query?: Query): Promise<T | null> => {
    try {
      return await request<T>('GET', withQuery(path, query));
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  },
  post: <T>(path: string, body?: unknown) =>
    request<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body?: unknown) =>
    request<T>('PATCH', path, body ?? {}),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Unable to complete the request. Check your connection and try again.';
}
