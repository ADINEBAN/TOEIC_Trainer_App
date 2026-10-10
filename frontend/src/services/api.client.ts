import { API_BASE_URL } from '@/src/config/env';
import { getAdminToken, getToken } from '@/src/services/storage';

export class ApiError extends Error {
  statusCode?: number;
  requestUrl: string;
  responseBody?: unknown;

  constructor(message: string, requestUrl: string, statusCode?: number, responseBody?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.requestUrl = requestUrl;
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  method?: HttpMethod;
  body?: unknown; // JSON-serializable, or FormData when multipart
  headers?: Record<string, string>;
  admin?: boolean; // use admin token instead of user token
  multipart?: boolean;
  noAuth?: boolean;
}

function buildUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (API_BASE_URL.endsWith('/api') && normalized.startsWith('/api/')) {
    return `${API_BASE_URL}${normalized.slice(4)}`;
  }
  return `${API_BASE_URL}${normalized}`;
}

function extractMessage(payload: unknown, status?: number): string {
  if (payload && typeof payload === 'object') {
    const p = payload as Record<string, unknown>;
    if (typeof p.message === 'string' && p.message) return p.message;
    if (typeof p.error === 'string' && p.error) return p.error;
  }
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.';
  if (status === 403) return 'Bạn không có quyền thực hiện thao tác này.';
  if (status === 404) return 'Không tìm thấy dữ liệu yêu cầu.';
  if (status && status >= 500) return 'Máy chủ đang bận. Thử lại sau ít phút.';
  if (status) return `Yêu cầu thất bại (mã ${status}).`;
  return 'Không thể kết nối tới máy chủ.';
}

async function buildHeaders(options: RequestOptions): Promise<Record<string, string>> {
  const headers: Record<string, string> = { ...(options.headers ?? {}) };
  if (!options.multipart && options.body !== undefined) {
    headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
  }
  if (!options.noAuth) {
    const token = options.admin ? await getAdminToken() : await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = buildUrl(path);
  const headers = await buildHeaders(options);

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    body = options.multipart
      ? (options.body as unknown as BodyInit)
      : JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body,
    });
  } catch (error) {
    throw new ApiError(
      `Không thể kết nối tới máy chủ (${url}). Kiểm tra mạng và API_BASE_URL.`,
      url,
      undefined,
      error instanceof Error ? error.message : undefined
    );
  }

  const payload = (await response.json().catch(() => null)) as T | null;
  if (!response.ok) {
    throw new ApiError(extractMessage(payload, response.status), url, response.status, payload);
  }
  // Backend wraps successful bodies in {success, data, message}; unwrap to the raw DTO.
  return unwrapEnvelope(payload) as T;
}

/** Backend envelope: {success: boolean, data: T, message}. Returns payload.data when present. */
function unwrapEnvelope(payload: unknown): unknown {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const p = payload as Record<string, unknown>;
    if (typeof p.success === 'boolean' && 'data' in p) {
      return p.data;
    }
  }
  return payload;
}

// Raw binary download (TTS mp3). Returns an ArrayBuffer of audio bytes.
export async function apiDownload(path: string, options: RequestOptions = {}): Promise<ArrayBuffer> {
  const url = buildUrl(path);
  const headers = await buildHeaders(options);
  let response: Response;
  try {
    response = await fetch(url, { method: options.method ?? 'GET', headers });
  } catch (error) {
    throw new ApiError(
      `Không thể kết nối tới máy chủ (${url}).`,
      url,
      undefined,
      error instanceof Error ? error.message : undefined
    );
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ApiError(extractMessage(payload, response.status), url, response.status, payload);
  }
  return response.arrayBuffer();
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.statusCode === 401;
}
