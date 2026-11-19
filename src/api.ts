import { seed } from './data';
import type { DB } from './types';
const key = 'faq-demo-v1';
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function readDemo(storageKey = key): DB {
  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return structuredClone(seed);
    const db: DB = JSON.parse(saved);
    // One-time upgrade of the local demo; keep existing projects, tickets and payments.
    if (!db.accountScreensVersion) {
      if (!db.tickets.length) db.tickets = structuredClone(seed.tickets);
      if (!db.transactions.length) db.transactions = structuredClone(seed.transactions);
      db.accountScreensVersion = 1;
      try {
        writeDemo(db, storageKey);
      } catch {
        /* The UI can still read existing data when storage is full. */
      }
    }
    return db;
  } catch {
    return structuredClone(seed);
  }
}
export function writeDemo(db: DB, storageKey = key) {
  localStorage.setItem(storageKey, JSON.stringify(db));
}
export async function httpRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  let response: Response;
  try {
    response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}${path}`, {
      ...options,
      headers,
      credentials: 'include',
      cache: 'no-store',
      signal: options.signal
        ? AbortSignal.any([options.signal, AbortSignal.timeout(10000)])
        : AbortSignal.timeout(10000),
    });
  } catch {
    throw new ApiError(
      0,
      'Не удалось связаться с сервером. Проверьте подключение и попробуйте ещё раз.',
    );
  }
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new ApiError(response.status, error?.message || 'Не удалось выполнить запрос');
  }
  if (response.status === 204) return undefined as T;
  try {
    return await response.json();
  } catch {
    throw new ApiError(502, 'Сервер вернул некорректный ответ. Попробуйте позже.');
  }
}
/** Typed transport. Mock routes stay behind the same REST boundary as the future Go API. */
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const env = (import.meta as ImportMeta & { env: Record<string, string> }).env;
  if (env.VITE_API_MODE !== 'real') {
    await new Promise((resolve) => setTimeout(resolve, 180));
    const db = readDemo();
    if (path === '/state' && (!options.method || options.method === 'GET')) return db as T;
    if (path === '/state' && options.method === 'PUT') {
      const next = JSON.parse(String(options.body));
      writeDemo(next);
      return next as T;
    }
    if (path === '/session' && options.method === 'DELETE') {
      db.user = null;
      writeDemo(db);
      return undefined as T;
    }
    throw new ApiError(404, 'Демонстрационный маршрут не найден');
  }
  return httpRequest<T>(path, options);
}
export const api = {
  load: () => request<DB>('/state'),
  save: (db: DB) => request<DB>('/state', { method: 'PUT', body: JSON.stringify(db) }),
};
