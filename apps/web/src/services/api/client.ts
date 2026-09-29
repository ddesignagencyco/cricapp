import type { PaginatedResponse } from '../../types/index';

/* ─── Config ──────────────────────────────────────────────── */

const CLIENT_BASE: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const SERVER_BASE: string = process.env.API_URL || CLIENT_BASE;

function getBase(): string {
  return typeof window === 'undefined' ? SERVER_BASE : CLIENT_BASE;
}

/* ─── Types ───────────────────────────────────────────────── */

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean | undefined | null>;
  /** Request body. FormData is sent unchanged; all other values are JSON-serialized. */
  body?: unknown | FormData;
  /** Next.js cache option (server components only) */
  cache?: RequestCache;
  /** Next.js revalidation interval in seconds (server components only) */
  revalidate?: number | false;
}

/* ─── Error handling ──────────────────────────────────────── */

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

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text().catch(() => '');
    }
    const message =
      (body && typeof body === 'object' && 'message' in body && String((body as Record<string, unknown>).message)) ||
      `API error ${res.status}`;
    throw new ApiError(res.status, message, body);
  }
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    return (text || undefined) as T;
  }
  return res.json();
}

/* ─── Query string builder ────────────────────────────────── */

function buildQuery(params?: Record<string, string | number | boolean | undefined | null>): string {
  if (!params) return '';
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    qs.set(k, String(v));
  });
  const str = qs.toString();
  return str ? `?${str}` : '';
}

/* ─── Core fetch wrapper ──────────────────────────────────── */

async function request<T>(
  method: string,
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, cache, revalidate, headers: customHeaders, body: reqBody, ...rest } = options;
  const base = getBase();
  const url = `${base}/api${path}${buildQuery(params)}`;

  const init: RequestInit = {
    method,
    headers: { ...customHeaders },
    ...rest,
    credentials: rest.credentials ?? 'include',
  };

  if (reqBody !== undefined) {
    if (reqBody instanceof FormData) {
      init.body = reqBody;
    } else {
      init.body = JSON.stringify(reqBody);
      const headers = new Headers(init.headers);
      if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
      init.headers = headers;
    }
  }

  // Next.js caching options (only work in server components)
  if (cache !== undefined) init.cache = cache;
  if (revalidate !== undefined) {
    (init as Record<string, unknown>).next = { revalidate };
  }

  const res = await fetch(url, init);
  return handleResponse<T>(res);
}

/* ─── Public API ──────────────────────────────────────────── */

export async function apiGet<T = unknown>(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>,
  options?: RequestOptions
): Promise<T> {
  return request<T>('GET', path, { ...options, params });
}

export async function apiGetOptional<T = unknown>(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>,
  options?: RequestOptions
): Promise<T | null> {
  try {
    return await apiGet<T>(path, params, options);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 429)) return null;
    throw error;
  }
}

export async function apiPost<T = unknown>(
  path: string,
  body?: unknown,
  options?: RequestOptions
): Promise<T> {
  return request<T>('POST', path, { ...options, body });
}

export async function apiPut<T = unknown>(
  path: string,
  body?: unknown,
  options?: RequestOptions
): Promise<T> {
  return request<T>('PUT', path, { ...options, body });
}

export async function apiPatch<T = unknown>(
  path: string,
  body?: unknown,
  options?: RequestOptions
): Promise<T> {
  return request<T>('PATCH', path, { ...options, body });
}

export async function apiDelete<T = unknown>(
  path: string,
  options?: RequestOptions
): Promise<T> {
  return request<T>('DELETE', path, options);
}

/* ─── Response extractors ─────────────────────────────────── */

const EMPTY_META: PageMeta = { total: 0, page: 1, limit: 20, totalPages: 0 };

/**
 * Extract items and pagination meta from API response.
 * Handles: { data, meta: { totalRecords, totalPages, page, limit } } | plain array | null
 */
export function extractPage<T>(res: unknown): { items: T[]; meta: PageMeta } {
  if (!res) return { items: [], meta: EMPTY_META };

  // Plain array response
  if (Array.isArray(res)) {
    const total = res.length;
    return { items: res, meta: { total, page: 1, limit: total || 1, totalPages: 1 } };
  }

  // Paginated envelope: { data: [...], meta: { totalRecords, totalPages, page, limit, ... } }
  if (typeof res === 'object' && res !== null && 'data' in res && Array.isArray((res as PaginatedResponse<T>).data)) {
    const p = res as PaginatedResponse<T>;
    const m = p.meta;
    if (m && typeof m === 'object') {
      const total = Number(m.totalRecords) || 0;
      const page = Number(m.page) || 1;
      const limit = Number(m.limit) || 20;
      return {
        items: p.data,
        meta: { total, page, limit, totalPages: Number(m.totalPages) || (limit > 0 ? Math.ceil(total / limit) : 0) },
      };
    }
    // Fallback: { data: [...] } without meta
    return { items: p.data, meta: { total: p.data.length, page: 1, limit: p.data.length || 1, totalPages: 1 } };
  }

  return { items: [], meta: EMPTY_META };
}

export { CLIENT_BASE, SERVER_BASE };
