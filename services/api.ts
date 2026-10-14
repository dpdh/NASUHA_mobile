import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { readJson, remove, writeJson } from './storage';

// Base URL backend nasjak-backend, mis. http://192.168.1.10:3100/api/v1 (HP fisik) atau
// http://10.0.2.2:3100/api/v1 (emulator Android). Diatur lewat EXPO_PUBLIC_API_BASE_URL.
const DEFAULT_BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3100/api/v1' : 'http://localhost:3100/api/v1';
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/$/, '');

const TOKEN_KEY = '@nasjak_token';
const REQUEST_TIMEOUT_MS = 20000;

let authToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export class ApiError extends Error {
  status: number;
  field?: string;
  code?: string;
  feature?: string;

  constructor(message: string, status: number, extra: { field?: string; code?: string; feature?: string } = {}) {
    super(message);
    this.status = status;
    this.field = extra.field;
    this.code = extra.code;
    this.feature = extra.feature;
  }

  get isFeatureLocked() {
    return this.code === 'FEATURE_LOCKED';
  }

  get isNetworkError() {
    return this.status === 0;
  }
}

export interface PageMeta {
  page: number;
  perPage: number;
  total: number;
  lastPage: number;
  [key: string]: unknown;
}

export interface ApiResult<T> {
  data: T;
  meta?: PageMeta & Record<string, any>;
}

export async function loadToken(): Promise<string | null> {
  authToken = await readJson<string>(TOKEN_KEY);
  return authToken;
}

export async function setToken(token: string | null): Promise<void> {
  authToken = token;
  if (token) await writeJson(TOKEN_KEY, token);
  else await remove(TOKEN_KEY);
}

export function getToken(): string | null {
  return authToken;
}

export function onUnauthorized(handler: () => void) {
  unauthorizedHandler = handler;
}

type Query = Record<string, string | number | boolean | null | undefined>;

export function buildQuery(query?: Query): string {
  if (!query) return '';
  const params = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return params.length ? `?${params.join('&')}` : '';
}

interface RequestOptions {
  body?: unknown;
  query?: Query;
  form?: FormData;
}

export async function apiRequest<T>(method: string, path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  let body: any;
  if (options.form) {
    body = options.form;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}${buildQuery(options.query)}`, {
      method,
      headers,
      body,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.', 0);
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 204) return { data: undefined as T };
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && authToken) unauthorizedHandler?.();
    throw new ApiError(payload?.error || `Terjadi kesalahan (${response.status}).`, response.status, {
      field: payload?.field,
      code: payload?.code,
      feature: payload?.feature,
    });
  }
  return { data: payload.data as T, meta: payload.meta };
}

export const api = {
  get: <T>(path: string, query?: Query) => apiRequest<T>('GET', path, { query }).then((result) => result.data),
  getPage: <T>(path: string, query?: Query) => apiRequest<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown) => apiRequest<T>('POST', path, { body }).then((result) => result.data),
  put: <T>(path: string, body?: unknown) => apiRequest<T>('PUT', path, { body }).then((result) => result.data),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>('PATCH', path, { body }).then((result) => result.data),
  delete: <T = void>(path: string, body?: unknown) => apiRequest<T>('DELETE', path, { body }).then((result) => result.data),
};

// Unggah gambar lokal (hasil expo-image-picker) sebagai multipart.
export async function uploadImage<T>(path: string, uri: string, fields: Record<string, string> = {}): Promise<T> {
  const form = new FormData();
  const name = uri.split('/').pop()?.split('?')[0] || 'foto.jpg';
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    form.append('file', blob, name.includes('.') ? name : `foto.${blob.type.split('/')[1] || 'jpg'}`);
  } else {
    // fetch bawaan Expo (expo/fetch) tidak menerima objek { uri, name, type } ala React Native;
    // bagian file harus berupa Blob, dan File expo-file-system mengimplementasikannya.
    form.append('file', new File(uri));
  }
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  const result = await apiRequest<T>('POST', path, { form });
  return result.data;
}

export function errorMessage(error: unknown, fallback = 'Terjadi kesalahan. Coba lagi.'): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
